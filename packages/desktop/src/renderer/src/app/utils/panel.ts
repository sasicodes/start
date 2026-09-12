import type { SidePanelMode } from '@renderer/app/types';
import type { PanelLayoutProps } from '@renderer/shared/panel/types';

export type SidePanelModeLayout = Pick<
  PanelLayoutProps,
  'sidePanelResizable' | 'maxSidePanelWidthRatio' | 'minSidePanelWidthRatio'
>;

const browserSidePanelLayout: SidePanelModeLayout = {
  sidePanelResizable: true,
  minSidePanelWidthRatio: 0.5
};
const settingsSidePanelLayout: SidePanelModeLayout = {
  sidePanelResizable: false,
  maxSidePanelWidthRatio: 0.3
};

export const sidePanelModeLabel = (mode: SidePanelMode) => (mode === 'settings' ? 'Settings' : 'Browser and review');

export const sidePanelModeLayout = (mode: SidePanelMode): SidePanelModeLayout =>
  mode === 'settings' ? settingsSidePanelLayout : browserSidePanelLayout;
