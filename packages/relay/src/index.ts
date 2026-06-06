import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { WebSocketServer } from 'ws';
import { relayBanner } from './banner';
import { loadConfig, tokenWarning } from './config';
import { messageMaxBytes, relaySocketPath } from './constants';
import { handleHello } from './handlers';
import { RelayState } from './state';

const app = new Hono();
const config = loadConfig();
const state = new RelayState();

app.get('/health', (context) => context.json({ ok: true }));
app.get('/ready', (context) => context.json({ ok: true, ...state.snapshot() }));

const server = serve({ fetch: app.fetch, port: config.port }, (info) => {
  process.stdout.write(`${relayBanner(`ws://localhost:${info.port}${relaySocketPath}`, config.token)}\n`);
  const warning = tokenWarning(config.token);
  if (warning) process.stderr.write(`${warning}\n`);
});

const sockets = new WebSocketServer({
  noServer: true,
  maxPayload: messageMaxBytes
});

sockets.on('connection', (socket) => {
  socket.once('message', (data) => handleHello({ config, state }, socket, data));
});

server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
  if (url.pathname !== relaySocketPath) {
    socket.destroy();
    return;
  }

  sockets.handleUpgrade(request, socket, head, (webSocket) => {
    sockets.emit('connection', webSocket, request);
  });
});
