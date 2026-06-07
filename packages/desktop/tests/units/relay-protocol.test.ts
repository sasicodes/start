import {
  desktopBroadcastMessage,
  desktopEventMessage,
  helloDesktopMessage,
  pairingApproveMessage,
  pairingCreateMessage,
  parseRelayServerMessage,
  relayReply
} from '@main/relay/protocol';
import { describe, expect, it } from 'vitest';

describe('parseRelayServerMessage', () => {
  it('parses known server messages', () => {
    expect(parseRelayServerMessage(JSON.stringify({ type: 'relay.ready', role: 'desktop' }))).toEqual({
      type: 'relay.ready',
      role: 'desktop'
    });
    expect(parseRelayServerMessage(JSON.stringify({ type: 'pairing.created', code: '123456', expiresAt: 10 }))).toEqual(
      { type: 'pairing.created', code: '123456', expiresAt: 10 }
    );
    expect(parseRelayServerMessage(JSON.stringify({ type: 'mobile.disconnected', mobileId: 'mobile-1' }))).toEqual({
      type: 'mobile.disconnected',
      mobileId: 'mobile-1'
    });
  });

  it('parses a mobile command with a well-formed payload', () => {
    expect(
      parseRelayServerMessage(
        JSON.stringify({ type: 'mobile.command', mobileId: 'mobile-1', payload: { action: 'prompt', value: 'hi' } })
      )
    ).toEqual({ type: 'mobile.command', mobileId: 'mobile-1', payload: { action: 'prompt', value: 'hi' } });
  });

  it('parses a mobile session index request', () => {
    expect(
      parseRelayServerMessage(
        JSON.stringify({
          type: 'mobile.command',
          mobileId: 'mobile-1',
          payload: { action: 'sessions.list', requestId: 'request-1', limit: 10, offset: 0 }
        })
      )
    ).toEqual({
      type: 'mobile.command',
      mobileId: 'mobile-1',
      payload: { action: 'sessions.list', requestId: 'request-1', limit: 10, offset: 0 }
    });
  });

  it('parses a mobile session archive request', () => {
    expect(
      parseRelayServerMessage(
        JSON.stringify({
          type: 'mobile.command',
          mobileId: 'mobile-1',
          payload: { action: 'session.archive', requestId: 'request-1', sessionId: 'session-1' }
        })
      )
    ).toEqual({
      type: 'mobile.command',
      mobileId: 'mobile-1',
      payload: { action: 'session.archive', requestId: 'request-1', sessionId: 'session-1' }
    });
  });

  it('parses a mobile session rename request', () => {
    expect(
      parseRelayServerMessage(
        JSON.stringify({
          type: 'mobile.command',
          mobileId: 'mobile-1',
          payload: { action: 'session.rename', requestId: 'request-1', sessionId: 'session-1', title: 'New title' }
        })
      )
    ).toEqual({
      type: 'mobile.command',
      mobileId: 'mobile-1',
      payload: { action: 'session.rename', requestId: 'request-1', sessionId: 'session-1', title: 'New title' }
    });
  });

  it('rejects malformed or unknown payloads', () => {
    expect(parseRelayServerMessage('not json')).toBeUndefined();
    expect(parseRelayServerMessage(JSON.stringify({ type: 'unknown' }))).toBeUndefined();
    expect(parseRelayServerMessage(JSON.stringify({ type: 'pairing.created', code: 5 }))).toBeUndefined();
    expect(
      parseRelayServerMessage(JSON.stringify({ type: 'mobile.command', mobileId: 'm1', payload: { action: 'prompt' } }))
    ).toBeUndefined();
    expect(
      parseRelayServerMessage(
        JSON.stringify({
          type: 'mobile.command',
          mobileId: 'm1',
          payload: { action: 'sessions.list', requestId: '', limit: 10 }
        })
      )
    ).toBeUndefined();
    expect(
      parseRelayServerMessage(
        JSON.stringify({
          type: 'mobile.command',
          mobileId: 'm1',
          payload: { action: 'messages.page', requestId: 'request-1', sessionId: 'session-1', limit: 51 }
        })
      )
    ).toBeUndefined();
  });
});

describe('desktopEventMessage', () => {
  it('builds a desktop event addressed to a mobile', () => {
    expect(desktopEventMessage('mobile-1', { action: 'ack', value: 'prompt' })).toEqual({
      type: 'desktop.event',
      mobileId: 'mobile-1',
      payload: { action: 'ack', value: 'prompt' }
    });
  });

  it('builds a desktop event broadcast', () => {
    expect(desktopBroadcastMessage({ action: 'sessions.changed', workspacePath: '/work/start' })).toEqual({
      type: 'desktop.event',
      payload: { action: 'sessions.changed', workspacePath: '/work/start' }
    });
  });
});

describe('relayReply', () => {
  it('creates a pairing code once the relay is ready', () => {
    expect(relayReply({ type: 'relay.ready', role: 'desktop' })).toEqual(pairingCreateMessage());
  });

  it('approves an incoming pairing request', () => {
    expect(relayReply({ type: 'pairing.request', code: '123456', mobileId: 'mobile-1' })).toEqual(
      pairingApproveMessage('mobile-1')
    );
  });

  it('does not reply to created or error messages', () => {
    expect(relayReply({ type: 'pairing.created', code: '123456', expiresAt: 10 })).toBeUndefined();
    expect(relayReply({ type: 'relay.error', message: 'nope' })).toBeUndefined();
  });
});

describe('helloDesktopMessage', () => {
  it('omits the token when empty', () => {
    expect(helloDesktopMessage('desktop-1', '')).toEqual({
      type: 'hello.desktop',
      desktopId: 'desktop-1',
      protocolVersion: 1
    });
    expect(helloDesktopMessage('desktop-1', 'secret')).toEqual({
      type: 'hello.desktop',
      token: 'secret',
      desktopId: 'desktop-1',
      protocolVersion: 1
    });
    expect(helloDesktopMessage('desktop-1', '', 'MacBook.local')).toEqual({
      type: 'hello.desktop',
      name: 'MacBook.local',
      desktopId: 'desktop-1',
      protocolVersion: 1
    });
  });
});
