import { DesktopRelay, type DesktopRelayCommandContext, type RelaySocketHandlers } from '@main/relay/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const enabledSettings = {
  enabled: true,
  relayUrl: 'wss://relay.test/connect',
  desktopId: 'desktop-1',
  desktopName: 'MacBook.local',
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
    const relay = new DesktopRelay({ onCode, onCommand: vi.fn() }, socket.factory);

    relay.sync(enabledSettings);
    socket.open();
    expect(socket.sent).toContainEqual({
      type: 'hello.desktop',
      token: 'secret',
      name: 'MacBook.local',
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

  it('runs an incoming mobile command and acks it back', () => {
    const onCommand = vi.fn();
    const socket = fakeSocket();
    const relay = new DesktopRelay({ onCode: vi.fn(), onCommand }, socket.factory);

    relay.sync(enabledSettings);
    socket.open();
    socket.emit(
      JSON.stringify({ type: 'mobile.command', mobileId: 'mobile-1', payload: { action: 'prompt', value: 'ship it' } })
    );

    expect(onCommand).toHaveBeenCalledWith(
      { action: 'prompt', value: 'ship it' },
      expect.objectContaining({ mobileId: 'mobile-1' })
    );
    expect(socket.sent).toContainEqual({
      type: 'desktop.event',
      mobileId: 'mobile-1',
      payload: { action: 'ack', value: 'prompt' }
    });
  });

  it('lets handlers reply to a mobile sync command', () => {
    const onCommand = vi.fn((_command: unknown, context: DesktopRelayCommandContext) => {
      context.reply({ action: 'sessions.list.result', requestId: 'request-1', ok: true, sessions: [] });
    });
    const socket = fakeSocket();
    const relay = new DesktopRelay({ onCode: vi.fn(), onCommand }, socket.factory);

    relay.sync(enabledSettings);
    socket.open();
    socket.emit(
      JSON.stringify({
        type: 'mobile.command',
        mobileId: 'mobile-1',
        payload: { action: 'sessions.list', requestId: 'request-1', limit: 10 }
      })
    );

    expect(socket.sent).toContainEqual({
      type: 'desktop.event',
      mobileId: 'mobile-1',
      payload: { action: 'sessions.list.result', requestId: 'request-1', ok: true, sessions: [] }
    });
  });

  it('replies with a request-scoped error when a mobile sync command fails', async () => {
    const onCommand = vi.fn(async () => {
      throw new Error('Session failed.');
    });
    const socket = fakeSocket();
    const relay = new DesktopRelay({ onCode: vi.fn(), onCommand }, socket.factory);

    relay.sync(enabledSettings);
    socket.open();
    socket.emit(
      JSON.stringify({
        type: 'mobile.command',
        mobileId: 'mobile-1',
        payload: { action: 'messages.page', requestId: 'request-1', sessionId: 'session-1' }
      })
    );
    await Promise.resolve();

    expect(socket.sent).toContainEqual({
      type: 'desktop.event',
      mobileId: 'mobile-1',
      payload: {
        ok: false,
        error: 'Session failed.',
        requestId: 'request-1',
        action: 'messages.page.result'
      }
    });
  });

  it('skips broadcasts when no mobile is paired', () => {
    const socket = fakeSocket();
    const relay = new DesktopRelay({ onCode: vi.fn(), onCommand: vi.fn() }, socket.factory);

    relay.sync(enabledSettings);
    socket.open();
    expect(relay.broadcast({ action: 'sessions.changed', workspacePath: '/work/start' })).toBe(false);

    expect(socket.sent).not.toContainEqual({
      type: 'desktop.event',
      payload: { action: 'sessions.changed', workspacePath: '/work/start' }
    });
  });

  it('broadcasts desktop events to paired mobiles only while they are connected', () => {
    const socket = fakeSocket();
    const relay = new DesktopRelay({ onCode: vi.fn(), onCommand: vi.fn() }, socket.factory);

    relay.sync(enabledSettings);
    socket.open();
    socket.emit(JSON.stringify({ type: 'pairing.request', code: '482913', mobileId: 'mobile-1' }));
    expect(relay.broadcast({ action: 'sessions.changed', workspacePath: '/work/start' })).toBe(true);

    expect(socket.sent).toContainEqual({
      type: 'desktop.event',
      payload: { action: 'sessions.changed', workspacePath: '/work/start' }
    });

    socket.emit(JSON.stringify({ type: 'mobile.disconnected', mobileId: 'mobile-1' }));
    expect(relay.broadcast({ action: 'sessions.changed', workspacePath: '/work/start' })).toBe(false);
  });

  it('ignores a malformed mobile command payload', () => {
    const onCommand = vi.fn();
    const socket = fakeSocket();
    const relay = new DesktopRelay({ onCode: vi.fn(), onCommand }, socket.factory);

    relay.sync(enabledSettings);
    socket.open();
    socket.emit(JSON.stringify({ type: 'mobile.command', mobileId: 'mobile-1', payload: { action: 'prompt' } }));

    expect(onCommand).not.toHaveBeenCalled();
  });

  it('stops cleanly, closing the socket and clearing the code', () => {
    const onCode = vi.fn();
    const socket = fakeSocket();
    const relay = new DesktopRelay({ onCode, onCommand: vi.fn() }, socket.factory);

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
    const relay = new DesktopRelay({ onCode: vi.fn(), onCommand: vi.fn() }, factory);

    relay.sync({ enabled: false, relayUrl: '', desktopId: 'desktop-1', desktopName: '', relayToken: '' });
    expect(factory).not.toHaveBeenCalled();
  });

  it('does not connect when the relay url is not a valid ws url', () => {
    const socket = fakeSocket();
    const factory = vi.fn(socket.factory);
    const relay = new DesktopRelay({ onCode: vi.fn(), onCommand: vi.fn() }, factory);

    relay.sync({
      enabled: true,
      relayUrl: 'Connect this desktop to your hosted relay',
      desktopId: 'desktop-1',
      desktopName: '',
      relayToken: ''
    });
    relay.sync({
      enabled: true,
      relayUrl: 'https://relay.example.com',
      desktopId: 'desktop-1',
      desktopName: '',
      relayToken: ''
    });
    expect(factory).not.toHaveBeenCalled();
  });
});
