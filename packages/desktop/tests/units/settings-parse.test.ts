import { parseSettings } from '@main/settings';
import { describe, expect, it } from 'vitest';

describe('parseSettings', () => {
  it('falls back to defaults for missing or invalid values', () => {
    const settings = parseSettings({});
    expect(settings.mobileRelay).toEqual({
      enabled: false,
      desktopId: '',
      relayUrl: '',
      desktopName: '',
      relayToken: ''
    });
    expect(settings.composerShortcut).toBe('Control+Space');
    expect(settings.solidWindowBackground).toBe(false);
    expect(settings.keepAwake).toBe(true);
  });

  it('keeps awake on by default and respects an explicit opt-out', () => {
    expect(parseSettings({ keepAwake: false }).keepAwake).toBe(false);
    expect(parseSettings({ keepAwake: 'nope' }).keepAwake).toBe(true);
  });

  it('keeps mobile relay settings trimmed', () => {
    expect(
      parseSettings({
        mobileRelay: {
          enabled: true,
          desktopId: ' desktop ',
          relayUrl: ' wss://relay.example.com/connect ',
          desktopName: ' MacBook.local ',
          relayToken: ' token '
        }
      }).mobileRelay
    ).toEqual({
      enabled: true,
      desktopId: 'desktop',
      relayUrl: 'wss://relay.example.com/connect',
      desktopName: 'MacBook.local',
      relayToken: 'token'
    });
  });

  it('keeps only an explicit solid window background preference', () => {
    expect(parseSettings({ solidWindowBackground: true }).solidWindowBackground).toBe(true);
    expect(parseSettings({ solidWindowBackground: false }).solidWindowBackground).toBe(false);
    expect(parseSettings({ solidWindowBackground: 'true' }).solidWindowBackground).toBe(false);
  });
});
