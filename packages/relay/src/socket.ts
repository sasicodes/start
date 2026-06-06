import { type RawData, WebSocket } from 'ws';
import { logError, logOutgoing } from './log';
import { relayError } from './messages';

export const sendJson = (socket: WebSocket, payload: unknown) => {
  if (socket.readyState !== WebSocket.OPEN) return;
  logOutgoing(payload);
  socket.send(JSON.stringify(payload));
};

export const closeWithError = (socket: WebSocket, message: string) => {
  sendJson(socket, relayError(message));
  socket.close();
};

export const guardSocket = (socket: WebSocket, scope: string) => {
  socket.on('error', (error) => logError(scope, error));
};

export const guardedHandler =
  (socket: WebSocket, scope: string, handler: (data: RawData) => void) => (data: RawData) => {
    try {
      handler(data);
    } catch (error) {
      logError(scope, error);
      sendJson(socket, relayError('Relay could not process the message.'));
    }
  };
