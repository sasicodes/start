import { describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import { guardedHandler } from '../src/socket';

const socket = () => {
  const sent: unknown[] = [];
  return {
    sent,
    socket: {
      readyState: WebSocket.OPEN,
      send: (message: string) => sent.push(JSON.parse(message) as unknown)
    } as unknown as WebSocket
  };
};

describe('guardedHandler', () => {
  it('forwards the data to the handler when it succeeds', () => {
    const client = socket();
    const seen: string[] = [];

    guardedHandler(client.socket, 'desktop', (data) => seen.push(data.toString()))(Buffer.from('ok'));

    expect(seen).toEqual(['ok']);
    expect(client.sent).toEqual([]);
  });

  it('returns a generic error and stays alive when the handler throws', () => {
    const client = socket();

    expect(() =>
      guardedHandler(client.socket, 'desktop', () => {
        throw new Error('boom: secret internal detail');
      })(Buffer.from('crash'))
    ).not.toThrow();

    expect(client.sent).toEqual([{ type: 'relay.error', message: 'Relay could not process the message.' }]);
  });
});
