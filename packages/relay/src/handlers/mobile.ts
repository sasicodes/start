import type { WebSocket } from 'ws';
import { pairingRequestMessage, pairingResumeMessage, relayError } from '../messages';
import type { HelloMobile } from '../protocol';
import { guardedHandler, sendJson } from '../socket';
import type { RelayContext } from '../types';
import { parseMobileMessage } from './parse';

export const handleMobile = (context: RelayContext, socket: WebSocket, hello: HelloMobile) => {
  context.state.addMobile({
    socket,
    mobileId: hello.mobileId,
    ...(hello.name ? { name: hello.name } : {})
  });
  sendJson(socket, { type: 'relay.ready', role: 'mobile' });

  socket.on(
    'message',
    guardedHandler(socket, 'mobile', (data) => {
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
            ...(message.trustKey ? { trustKey: message.trustKey } : {}),
            ...(message.publicKey ? { publicKey: message.publicKey } : {})
          })
        );
        return;
      }

      if (message.type === 'pairing.resume') {
        const desktop = context.state.desktopSocket(message.desktopId);
        if (!desktop) {
          sendJson(socket, relayError('Desktop is offline.'));
          return;
        }

        sendJson(
          desktop,
          pairingResumeMessage({
            mobileId: hello.mobileId,
            nonce: message.nonce,
            proof: message.proof
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
    })
  );

  socket.on('close', () => {
    for (const desktopId of context.state.deleteMobile(hello.mobileId, socket)) {
      const desktop = context.state.desktopSocket(desktopId);
      if (desktop) sendJson(desktop, { type: 'mobile.disconnected', mobileId: hello.mobileId });
    }
  });
};
