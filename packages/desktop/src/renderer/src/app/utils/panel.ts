import type { SidePanelMode } from '@renderer/app/types';
import type { PanelLayoutProps } from '@renderer/shared/panel/types';

export type SidePanelModeLayout = Pick<
  PanelLayoutProps,
  'sidePanelResizable' | 'maxSidePanelWidthRatio' | 'minSidePanelWidthRatio'
>;

const defaultSidePanelLayout: SidePanelModeLayout = { sidePanelResizable: true };
const browserSidePanelLayout: SidePanelModeLayout = {
  sidePanelResizable: true,
  minSidePanelWidthRatio: 0.5
};
const settingsSidePanelLayout: SidePanelModeLayout = {
  sidePanelResizable: false,
  maxSidePanelWidthRatio: 0.3
};

export const sidePanelModeLabel = (mode: SidePanelMode) => {
  if (mode === 'git') return 'Git changes';
  if (mode === 'settings') return 'Settings';
  if (mode === 'browser') return 'Browser';
  return 'Side panel';
};

export const sidePanelModeLayout = (mode: SidePanelMode): SidePanelModeLayout => {
  if (mode === 'settings') return settingsSidePanelLayout;
  if (mode === 'browser') return browserSidePanelLayout;
  return defaultSidePanelLayout;
};
