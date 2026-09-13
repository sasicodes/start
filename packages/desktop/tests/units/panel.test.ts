import { sidePanelModeLayout, toggledSidePanel } from '@renderer/app/utils/panel';
import { describe, expect, it } from 'vitest';

describe('side panel toggling', () => {
  it('opens the browser panel from a closed panel', () => {
    expect(toggledSidePanel({ open: false, mode: 'browser' }, 'browser')).toEqual({ open: true, mode: 'browser' });
  });

  it('closes the panel when its mode is already showing', () => {
    expect(toggledSidePanel({ open: true, mode: 'browser' }, 'browser')).toEqual({ open: false, mode: 'browser' });
  });

  it('switches modes instead of closing an open panel', () => {
    expect(toggledSidePanel({ open: true, mode: 'settings' }, 'browser')).toEqual({ open: true, mode: 'browser' });
    expect(toggledSidePanel({ open: true, mode: 'browser' }, 'settings')).toEqual({ open: true, mode: 'settings' });
  });

  it('keeps the settings panel open when a different tab is requested', () => {
    expect(toggledSidePanel({ open: true, mode: 'settings' }, 'settings', false)).toEqual({
      open: true,
      mode: 'settings'
    });
  });

  it('keeps the browser panel open when review is not the showing tab', () => {
    expect(toggledSidePanel({ open: true, mode: 'browser' }, 'browser', false)).toEqual({
      open: true,
      mode: 'browser'
    });
  });
});

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
});
