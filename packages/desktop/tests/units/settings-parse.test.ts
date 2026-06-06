import { parseSettings } from '@main/settings';
import { describe, expect, it } from 'vitest';

describe('parseSettings', () => {
  it('falls back to defaults for missing or invalid values', () => {
    const settings = parseSettings({});
    expect(settings.mobileRelay).toEqual({ desktopId: '', enabled: false, relayToken: '', relayUrl: '' });
    expect(settings.composerShortcut).toBe('Control+Space');
    expect(settings.solidWindowBackground).toBe(false);
  });

  it('keeps mobile relay settings trimmed', () => {
    expect(
      parseSettings({
        mobileRelay: {
          enabled: true,
          desktopId: ' desktop ',
          relayUrl: ' wss://relay.example.com/connect ',
          relayToken: ' token '
        }
      }).mobileRelay
    ).toEqual({
      enabled: true,
      desktopId: 'desktop',
      relayUrl: 'wss://relay.example.com/connect',
      relayToken: 'token'
    });
  });

  it('keeps only an explicit solid window background preference', () => {
    expect(parseSettings({ solidWindowBackground: true }).solidWindowBackground).toBe(true);
    expect(parseSettings({ solidWindowBackground: false }).solidWindowBackground).toBe(false);
    expect(parseSettings({ solidWindowBackground: 'true' }).solidWindowBackground).toBe(false);
  });
});
