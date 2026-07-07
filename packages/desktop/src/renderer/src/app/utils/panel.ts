import type { SidePanelMode } from '@renderer/app/types';

export const sidePanelModeLabel = (mode: SidePanelMode) => {
  if (mode === 'git') return 'Git changes';
  if (mode === 'settings') return 'Settings';
  if (mode === 'browser') return 'Browser';
  return 'Side panel';
};

export const sidePanelModeMaxRatio = (mode: SidePanelMode) => {
  if (mode === 'settings') return 0.3;
  return;
};

export const sidePanelModeMinRatio = (mode: SidePanelMode) => {
  if (mode === 'browser') return 0.5;
  return;
};

export const sidePanelModeResizable = (mode: SidePanelMode) => mode !== 'settings';
