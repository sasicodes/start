import { describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import { handleHello } from '../src/handlers';
import { RelayState } from '../src/state';

const socket = () => {
  const sent: unknown[] = [];
  const listeners = new Map<string, (data: Buffer) => void>();
  let closed = false;

  return {
    sent,
    closed: () => closed,
    emit: (event: string, data: Buffer) => listeners.get(event)?.(data),
    socket: {
      close: () => {
        closed = true;
      },
      on: (event: string, listener: (data: Buffer) => void) => listeners.set(event, listener),
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

  it('preserves the pairing code when the desktop is offline', () => {
    const client = socket();
    const state = new RelayState();
    const pairing = state.createPairing('desktop-1', 300000);

    handleHello(
      { config: { port: 8787, token: 'secret', pairingTtlMs: 300000 }, state },
      client.socket,
      Buffer.from(JSON.stringify({ type: 'hello.mobile', protocolVersion: 1, mobileId: 'mobile-1', token: 'secret' }))
    );
    client.emit('message', Buffer.from(JSON.stringify({ type: 'pairing.join', code: pairing.code })));

    expect(client.sent).toContainEqual({ type: 'relay.error', message: 'Desktop is offline.' });
    expect(state.peekPairing(pairing.code)?.desktopId).toBe('desktop-1');
  });

  it('forwards pairing resume requests and approvals', () => {
    const state = new RelayState();
    const context = { config: { port: 8787, token: 'secret', pairingTtlMs: 300000 }, state };
    const desktop = socket();
    const mobile = socket();

    handleHello(
      context,
      desktop.socket,
      Buffer.from(
        JSON.stringify({ type: 'hello.desktop', protocolVersion: 1, desktopId: 'desktop-1', token: 'secret' })
      )
    );
    handleHello(
      context,
      mobile.socket,
      Buffer.from(JSON.stringify({ type: 'hello.mobile', protocolVersion: 1, mobileId: 'mobile-1', token: 'secret' }))
    );

    mobile.emit(
      'message',
      Buffer.from(
        JSON.stringify({ type: 'pairing.resume', desktopId: 'desktop-1', nonce: 'nonce-1', proof: 'proof-1' })
      )
    );
    expect(desktop.sent).toContainEqual({
      type: 'pairing.resume',
      proof: 'proof-1',
      nonce: 'nonce-1',
      mobileId: 'mobile-1'
    });

    desktop.emit('message', Buffer.from(JSON.stringify({ type: 'pairing.approve', mobileId: 'mobile-1' })));
    expect(mobile.sent).toContainEqual({ type: 'pairing.approved', desktopId: 'desktop-1' });
    expect(state.isRouteApproved('desktop-1', 'mobile-1')).toBe(true);
  });

  it('forwards pairing resume rejections to mobile', () => {
    const state = new RelayState();
    const context = { config: { port: 8787, token: 'secret', pairingTtlMs: 300000 }, state };
    const desktop = socket();
    const mobile = socket();

    handleHello(
      context,
      desktop.socket,
      Buffer.from(
        JSON.stringify({ type: 'hello.desktop', protocolVersion: 1, desktopId: 'desktop-1', token: 'secret' })
      )
    );
    handleHello(
      context,
      mobile.socket,
      Buffer.from(JSON.stringify({ type: 'hello.mobile', protocolVersion: 1, mobileId: 'mobile-1', token: 'secret' }))
    );

    desktop.emit(
      'message',
      Buffer.from(JSON.stringify({ type: 'pairing.reject', mobileId: 'mobile-1', message: 'Mobile is not paired.' }))
    );

    expect(mobile.sent).toContainEqual({ type: 'relay.error', message: 'Mobile is not paired.' });
  });

  it('completes a full desktop-mobile pairing handshake', () => {
    const state = new RelayState();
    const context = { config: { port: 8787, token: 'secret', pairingTtlMs: 300000 }, state };
    const desktop = socket();
    const mobile = socket();
    const hello = (type: string, id: string) =>
      Buffer.from(
        JSON.stringify({
          type,
          protocolVersion: 1,
          [type === 'hello.desktop' ? 'desktopId' : 'mobileId']: id,
          token: 'secret'
        })
      );

    handleHello(context, desktop.socket, hello('hello.desktop', 'desktop-1'));
    desktop.emit('message', Buffer.from(JSON.stringify({ type: 'pairing.create' })));
    const created = desktop.sent.find((m) => (m as { type?: string }).type === 'pairing.created') as
      | { code: string }
      | undefined;
    expect(created?.code).toHaveLength(6);

    handleHello(context, mobile.socket, hello('hello.mobile', 'mobile-1'));
    mobile.emit('message', Buffer.from(JSON.stringify({ type: 'pairing.join', code: created?.code })));
    expect(desktop.sent).toContainEqual(expect.objectContaining({ type: 'pairing.request', mobileId: 'mobile-1' }));

    desktop.emit('message', Buffer.from(JSON.stringify({ type: 'pairing.approve', mobileId: 'mobile-1' })));
    expect(mobile.sent).toContainEqual({ type: 'pairing.approved', desktopId: 'desktop-1' });
    expect(state.isRouteApproved('desktop-1', 'mobile-1')).toBe(true);

    const mobileCommands = () =>
      desktop.sent.filter((message) => (message as { type?: string }).type === 'mobile.command');

    mobile.emit(
      'message',
      Buffer.from(
        JSON.stringify({ type: 'mobile.command', desktopId: 'desktop-1', payload: { action: 'ping', value: '1' } })
      )
    );
    expect(desktop.sent).toContainEqual(expect.objectContaining({ type: 'mobile.command', mobileId: 'mobile-1' }));
    expect(mobileCommands()).toHaveLength(1);

    mobile.emit('close', Buffer.alloc(0));
    expect(desktop.sent).toContainEqual({ type: 'mobile.disconnected', mobileId: 'mobile-1' });

    const reconnectedMobile = socket();
    handleHello(context, reconnectedMobile.socket, hello('hello.mobile', 'mobile-1'));
    reconnectedMobile.emit(
      'message',
      Buffer.from(
        JSON.stringify({ type: 'mobile.command', desktopId: 'desktop-1', payload: { action: 'ping', value: '2' } })
      )
    );

    expect(mobileCommands()).toHaveLength(2);
  });
});
