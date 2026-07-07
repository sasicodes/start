import { sidePanelModeLayout } from '@renderer/app/utils/panel';
import { describe, expect, it } from 'vitest';

describe('side panel mode settings', () => {
  it('keeps settings fixed at the minimum panel width', () => {
    expect(sidePanelModeLayout('settings')).toEqual({ maxRatio: 0.3, resizable: false });
  });

  it('keeps the browser panel wide enough for page content', () => {
    expect(sidePanelModeLayout('browser')).toEqual({ minRatio: 0.5, resizable: true });
  });

  it('leaves git resizable at the default size limits', () => {
    expect(sidePanelModeLayout('git')).toEqual({ resizable: true });
  });
});
