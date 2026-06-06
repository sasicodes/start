import { DesktopRelay, type RelaySocketHandlers } from '@main/relay/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const enabledSettings = {
  enabled: true,
  relayUrl: 'wss://relay.test/connect',
  desktopId: 'desktop-1',
  relayToken: 'secret'
};

const fakeSocket = () => {
  const sent: unknown[] = [];
  let handlers: RelaySocketHandlers | undefined;
  let closed = false;

  return {
    sent,
    closed: () => closed,
    emit: (raw: string) => handlers?.onMessage(raw),
    open: () => handlers?.onOpen(),
    drop: () => handlers?.onClose(),
    factory: (_url: string, next: RelaySocketHandlers) => {
      handlers = next;
      return {
        send: (data: string) => sent.push(JSON.parse(data) as unknown),
        close: () => {
          closed = true;
        }
      };
    }
  };
};

describe('DesktopRelay', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: 0 });
  });

  it('drives the full pairing handshake and surfaces the code', () => {
    const onCode = vi.fn();
    const socket = fakeSocket();
    const relay = new DesktopRelay(onCode, socket.factory);

    relay.sync(enabledSettings);
    socket.open();
    expect(socket.sent).toContainEqual({
      type: 'hello.desktop',
      token: 'secret',
      desktopId: 'desktop-1',
      protocolVersion: 1
    });

    socket.emit(JSON.stringify({ type: 'relay.ready', role: 'desktop' }));
    expect(socket.sent).toContainEqual({ type: 'pairing.create' });

    socket.emit(JSON.stringify({ type: 'pairing.created', code: '482913', expiresAt: 300000 }));
    expect(onCode).toHaveBeenCalledWith('482913');
    expect(relay.currentCode).toBe('482913');

    socket.emit(JSON.stringify({ type: 'pairing.request', code: '482913', mobileId: 'mobile-1' }));
    expect(socket.sent).toContainEqual({ type: 'pairing.approve', mobileId: 'mobile-1' });
  });

  it('stops cleanly, closing the socket and clearing the code', () => {
    const onCode = vi.fn();
    const socket = fakeSocket();
    const relay = new DesktopRelay(onCode, socket.factory);

    relay.sync(enabledSettings);
    socket.open();
    socket.emit(JSON.stringify({ type: 'pairing.created', code: '482913', expiresAt: 300000 }));

    relay.stop();
    expect(socket.closed()).toBe(true);
    expect(relay.currentCode).toBe('');
    expect(onCode).toHaveBeenLastCalledWith('');
  });

  it('does not connect when relay is disabled', () => {
    const socket = fakeSocket();
    const factory = vi.fn(socket.factory);
    const relay = new DesktopRelay(vi.fn(), factory);

    relay.sync({ enabled: false, relayUrl: '', desktopId: 'desktop-1', relayToken: '' });
    expect(factory).not.toHaveBeenCalled();
  });
});
