import type { WebSocket } from 'ws';
import { relayError } from '../messages';
import type { DesktopMessage, HelloDesktop } from '../protocol';
import { sendJson } from '../socket';
import type { RelayContext } from '../types';
import { parseDesktopMessage } from './parse';

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
