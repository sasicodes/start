import { parseSettings } from '@main/settings';
import { describe, expect, it } from 'vitest';

describe('parseSettings', () => {
  it('falls back to defaults for missing or invalid values', () => {
    const settings = parseSettings({});
    expect(settings.composerShortcut).toBe('Control+Space');
    expect(settings.solidWindowBackground).toBe(false);
  });

  it('keeps only an explicit solid window background preference', () => {
    expect(parseSettings({ solidWindowBackground: true }).solidWindowBackground).toBe(true);
    expect(parseSettings({ solidWindowBackground: false }).solidWindowBackground).toBe(false);
    expect(parseSettings({ solidWindowBackground: 'true' }).solidWindowBackground).toBe(false);
  });
});
