import { mobilePairingPayload, mobilePairingQrSvg } from '@renderer/shared/settings/utils/pairing';
import { describe, expect, it } from 'vitest';

describe('mobile pairing', () => {
  it('encodes relay settings for mobile pairing', () => {
    expect(
      JSON.parse(
        mobilePairingPayload({
          enabled: true,
          desktopId: 'desktop-1',
          relayUrl: 'wss://relay.example.com/connect',
          desktopName: 'MacBook.local',
          relayToken: 'secret'
        })
      )
    ).toEqual({
      type: 'start.mobile.relay',
      version: 1,
      desktopId: 'desktop-1',
      desktopName: 'MacBook.local',
      relayUrl: 'wss://relay.example.com/connect',
      relayToken: 'secret'
    });
  });

  it('omits an empty relay token', () => {
    expect(
      JSON.parse(
        mobilePairingPayload({
          enabled: true,
          desktopId: 'desktop-1',
          relayUrl: 'wss://relay.example.com/connect',
          desktopName: '',
          relayToken: ''
        })
      ).relayToken
    ).toBeUndefined();
  });

  it('includes a live pairing code and omits it when absent', () => {
    const settings = {
      enabled: true,
      desktopId: 'desktop-1',
      relayUrl: 'wss://relay.example.com/connect',
      desktopName: '',
      relayToken: ''
    };
    expect(JSON.parse(mobilePairingPayload(settings, '482913')).code).toBe('482913');
    expect(JSON.parse(mobilePairingPayload(settings)).code).toBeUndefined();
  });

  it('renders an actual qr svg', () => {
    const svg = mobilePairingQrSvg({
      enabled: true,
      desktopId: 'desktop-1',
      relayUrl: 'wss://relay.example.com/connect',
      desktopName: '',
      relayToken: ''
    });

    expect(svg).toContain('<svg');
    expect(svg).toContain('<rect');
  });
});
