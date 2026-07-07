import { sidePanelModeMaxRatio, sidePanelModeMinRatio, sidePanelModeResizable } from '@renderer/app/utils/panel';
import { describe, expect, it } from 'vitest';

describe('side panel mode settings', () => {
  it('keeps settings fixed at the minimum panel width', () => {
    expect(sidePanelModeMaxRatio('settings')).toBe(0.3);
    expect(sidePanelModeMinRatio('settings')).toBeUndefined();
    expect(sidePanelModeResizable('settings')).toBe(false);
  });

  it('keeps the browser panel wide enough for page content', () => {
    expect(sidePanelModeMaxRatio('browser')).toBeUndefined();
    expect(sidePanelModeMinRatio('browser')).toBe(0.5);
    expect(sidePanelModeResizable('browser')).toBe(true);
  });

  it('leaves git resizable at the default size limits', () => {
    expect(sidePanelModeMaxRatio('git')).toBeUndefined();
    expect(sidePanelModeMinRatio('git')).toBeUndefined();
    expect(sidePanelModeResizable('git')).toBe(true);
  });
});
