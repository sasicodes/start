import { WebSocket } from 'ws';
import { relayError } from './messages';

export const sendJson = (socket: WebSocket, payload: unknown) => {
  if (socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify(payload));
};

export const closeWithError = (socket: WebSocket, message: string) => {
  sendJson(socket, relayError(message));
  socket.close();
};
