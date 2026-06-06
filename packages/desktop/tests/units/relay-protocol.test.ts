import {
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
  });

  it('rejects malformed or unknown payloads', () => {
    expect(parseRelayServerMessage('not json')).toBeUndefined();
    expect(parseRelayServerMessage(JSON.stringify({ type: 'unknown' }))).toBeUndefined();
    expect(parseRelayServerMessage(JSON.stringify({ type: 'pairing.created', code: 5 }))).toBeUndefined();
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
  });
});
