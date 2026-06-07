import { sidePanelModeMaxRatio, sidePanelModeResizable } from '@renderer/app/utils/panel';
import { describe, expect, it } from 'vitest';

describe('side panel mode settings', () => {
  it('keeps settings fixed at the minimum panel width', () => {
    expect(sidePanelModeMaxRatio('settings')).toBe(0.3);
    expect(sidePanelModeResizable('settings')).toBe(false);
  });

  it('leaves other side panels resizable at the default maximum', () => {
    expect(sidePanelModeMaxRatio('browser')).toBeUndefined();
    expect(sidePanelModeMaxRatio('git')).toBeUndefined();
    expect(sidePanelModeResizable('browser')).toBe(true);
    expect(sidePanelModeResizable('git')).toBe(true);
  });
});
