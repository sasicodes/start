import type { SidePanelMode } from '@renderer/app/types';

export interface SidePanelModeLayout {
  maxRatio?: number;
  minRatio?: number;
  resizable: boolean;
}

export const sidePanelModeLabel = (mode: SidePanelMode) => {
  if (mode === 'git') return 'Git changes';
  if (mode === 'settings') return 'Settings';
  if (mode === 'browser') return 'Browser';
  return 'Side panel';
};

export const sidePanelModeLayout = (mode: SidePanelMode): SidePanelModeLayout => {
  if (mode === 'settings') return { maxRatio: 0.3, resizable: false };
  if (mode === 'browser') return { minRatio: 0.5, resizable: true };
  return { resizable: true };
};
