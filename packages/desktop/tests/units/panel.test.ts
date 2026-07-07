import { sidePanelModeLayout } from '@renderer/app/utils/panel';
import { describe, expect, it } from 'vitest';

describe('side panel mode settings', () => {
  it('keeps settings fixed at the minimum panel width', () => {
    expect(sidePanelModeLayout('settings')).toEqual({
      sidePanelResizable: false,
      maxSidePanelWidthRatio: 0.3
    });
  });

  it('keeps the browser panel wide enough for page content', () => {
    expect(sidePanelModeLayout('browser')).toEqual({
      sidePanelResizable: true,
      minSidePanelWidthRatio: 0.5
    });
  });

  it('leaves git resizable at the default size limits', () => {
    expect(sidePanelModeLayout('git')).toEqual({ sidePanelResizable: true });
  });
});
