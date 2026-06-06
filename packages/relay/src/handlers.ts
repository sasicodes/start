import * as v from 'valibot';
import type { RawData, WebSocket } from 'ws';
import { pairingRequestMessage, relayError } from './messages';
import {
  type HelloMobile,
  type HelloDesktop,
  parseJsonMessage,
  type MobileMessage,
  helloMobileSchema,
  type DesktopMessage,
  mobileMessageSchema,
  helloDesktopSchema,
  desktopMessageSchema
} from './protocol';
import { closeWithError, sendJson } from './socket';
import type { RelayState } from './state';
import type { RelayConfig } from './types';

interface RelayContext {
  state: RelayState;
  config: RelayConfig;
}

const authenticated = (config: RelayConfig, token?: string) => !config.token || token === config.token;

const sourceFromRawData = (data: RawData) => {
  if (Buffer.isBuffer(data)) return data.toString('utf8');
  if (Array.isArray(data)) return Buffer.concat(data).toString('utf8');
  return Buffer.from(data).toString('utf8');
};

const parseDesktopMessage = (socket: WebSocket, data: RawData): DesktopMessage | null => {
  const parsed = parseJsonMessage(sourceFromRawData(data));
  if (!parsed.ok) {
    sendJson(socket, relayError(parsed.error));
    return null;
  }

  const result = v.safeParse(desktopMessageSchema, parsed.value);
  if (!result.success) {
    sendJson(socket, relayError('Desktop message shape is invalid.'));
    return null;
  }

  return result.output;
};

const parseMobileMessage = (socket: WebSocket, data: RawData): MobileMessage | null => {
  const parsed = parseJsonMessage(sourceFromRawData(data));
  if (!parsed.ok) {
    sendJson(socket, relayError(parsed.error));
    return null;
  }

  const result = v.safeParse(mobileMessageSchema, parsed.value);
  if (!result.success) {
    sendJson(socket, relayError('Mobile message shape is invalid.'));
    return null;
  }

  return result.output;
};

const handleDesktopEvent = (context: RelayContext, socket: WebSocket, hello: HelloDesktop, message: DesktopMessage) => {
  if (message.type !== 'desktop.event') return false;

  if (message.mobileId) {
    if (!context.state.isRouteApproved(hello.desktopId, message.mobileId)) {
      sendJson(socket, relayError('Mobile is not paired with this desktop.'));
      return true;
    }

    const mobile = context.state.mobileSocket(message.mobileId);
    if (mobile) sendJson(mobile, { type: 'desktop.event', desktopId: hello.desktopId, payload: message.payload });
    return true;
  }

  for (const mobileId of context.state.mobileIds(hello.desktopId)) {
    const mobile = context.state.mobileSocket(mobileId);
    if (mobile) sendJson(mobile, { type: 'desktop.event', desktopId: hello.desktopId, payload: message.payload });
  }

  return true;
};

export const handleDesktop = (context: RelayContext, socket: WebSocket, hello: HelloDesktop) => {
  context.state.addDesktop({
    socket,
    desktopId: hello.desktopId,
    ...(hello.name ? { name: hello.name } : {})
  });
  sendJson(socket, { type: 'relay.ready', role: 'desktop' });

  socket.on('message', (data) => {
    const message = parseDesktopMessage(socket, data);
    if (!message) return;

    if (message.type === 'pairing.create') {
      sendJson(socket, {
        type: 'pairing.created',
        ...context.state.createPairing(hello.desktopId, context.config.pairingTtlMs)
      });
      return;
    }

    if (message.type === 'pairing.approve') {
      context.state.approveRoute(hello.desktopId, message.mobileId);
      const mobile = context.state.mobileSocket(message.mobileId);
      if (mobile) sendJson(mobile, { type: 'pairing.approved', desktopId: hello.desktopId });
      return;
    }

    handleDesktopEvent(context, socket, hello, message);
  });

  socket.on('close', () => context.state.deleteDesktop(hello.desktopId, socket));
};

export const handleMobile = (context: RelayContext, socket: WebSocket, hello: HelloMobile) => {
  context.state.addMobile({
    socket,
    mobileId: hello.mobileId,
    ...(hello.name ? { name: hello.name } : {})
  });
  sendJson(socket, { type: 'relay.ready', role: 'mobile' });

  socket.on('message', (data) => {
    const message = parseMobileMessage(socket, data);
    if (!message) return;

    if (message.type === 'pairing.join') {
      const pairing = context.state.peekPairing(message.code);
      if (!pairing) {
        sendJson(socket, relayError('Pairing code is invalid or expired.'));
        return;
      }

      const desktop = context.state.desktopSocket(pairing.desktopId);
      if (!desktop) {
        sendJson(socket, relayError('Desktop is offline.'));
        return;
      }

      context.state.consumePairing(message.code);
      sendJson(
        desktop,
        pairingRequestMessage({
          code: pairing.code,
          mobileId: hello.mobileId,
          ...(message.name ? { name: message.name } : {}),
          ...(message.publicKey ? { publicKey: message.publicKey } : {})
        })
      );
      return;
    }

    if (!context.state.isRouteApproved(message.desktopId, hello.mobileId)) {
      sendJson(socket, relayError('Mobile is not paired with this desktop.'));
      return;
    }

    const desktop = context.state.desktopSocket(message.desktopId);
    if (!desktop) {
      sendJson(socket, relayError('Desktop is offline.'));
      return;
    }

    sendJson(desktop, { type: 'mobile.command', mobileId: hello.mobileId, payload: message.payload });
  });

  socket.on('close', () => context.state.deleteMobile(hello.mobileId, socket));
};

export const handleHello = (context: RelayContext, socket: WebSocket, data: RawData) => {
  const parsed = parseJsonMessage(sourceFromRawData(data));
  if (!parsed.ok) {
    closeWithError(socket, parsed.error);
    return;
  }

  const desktop = v.safeParse(helloDesktopSchema, parsed.value);
  if (desktop.success) {
    if (!authenticated(context.config, desktop.output.token)) {
      closeWithError(socket, 'Relay token is invalid.');
      return;
    }

    handleDesktop(context, socket, desktop.output);
    return;
  }

  const mobile = v.safeParse(helloMobileSchema, parsed.value);
  if (mobile.success) {
    if (!authenticated(context.config, mobile.output.token)) {
      closeWithError(socket, 'Relay token is invalid.');
      return;
    }

    handleMobile(context, socket, mobile.output);
    return;
  }

  closeWithError(socket, 'First message must be a valid hello message.');
};
