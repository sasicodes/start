import { WebSocket } from 'ws';
import { handleHello } from '../src/handlers';
import { RelayState } from '../src/state';
import { describe, expect, it } from 'vitest';

const socket = () => {
  const sent: unknown[] = [];
  let closed = false;

  return {
    sent,
    closed: () => closed,
    socket: {
      close: () => {
        closed = true;
      },
      on: () => {},
      readyState: WebSocket.OPEN,
      send: (message: string) => sent.push(JSON.parse(message) as unknown)
    } as unknown as WebSocket
  };
};

describe('handleHello', () => {
  it('rejects connections when the relay token is invalid', () => {
    const client = socket();

    handleHello(
      { config: { port: 8787, token: 'secret', pairingTtlMs: 300000 }, state: new RelayState() },
      client.socket,
      Buffer.from(
        JSON.stringify({
          type: 'hello.mobile',
          protocolVersion: 1,
          mobileId: 'mobile-1',
          token: 'wrong'
        })
      )
    );

    expect(client.closed()).toBe(true);
    expect(client.sent).toEqual([{ type: 'relay.error', message: 'Relay token is invalid.' }]);
  });

  it('accepts connections when the relay token matches', () => {
    const client = socket();
    const state = new RelayState();

    handleHello(
      { config: { port: 8787, token: 'secret', pairingTtlMs: 300000 }, state },
      client.socket,
      Buffer.from(
        JSON.stringify({
          type: 'hello.desktop',
          protocolVersion: 1,
          desktopId: 'desktop-1',
          token: 'secret'
        })
      )
    );

    expect(client.closed()).toBe(false);
    expect(client.sent).toEqual([{ type: 'relay.ready', role: 'desktop' }]);
    expect(state.snapshot()).toEqual({ desktops: 1, mobiles: 0, pairings: 0 });
  });
});
