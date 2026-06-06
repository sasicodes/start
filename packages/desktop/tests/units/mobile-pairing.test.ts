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
          relayToken: 'secret'
        })
      )
    ).toEqual({
      type: 'start.mobile.relay',
      version: 1,
      desktopId: 'desktop-1',
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
          relayToken: ''
        })
      ).relayToken
    ).toBeUndefined();
  });

  it('renders an actual qr svg', () => {
    const svg = mobilePairingQrSvg({
      enabled: true,
      desktopId: 'desktop-1',
      relayUrl: 'wss://relay.example.com/connect',
      relayToken: ''
    });

    expect(svg).toContain('<svg');
    expect(svg).toContain('<rect');
  });
});
