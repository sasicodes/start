import type { SidePanelMode } from '@renderer/app/types';
import type { PanelLayoutProps } from '@renderer/shared/panel/types';
import type { SettingsTab } from '@renderer/shared/settings/tab';

export interface SidePanelState {
  open: boolean;
  mode: SidePanelMode;
}

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

export const toggledSidePanel = (
  { open, mode }: SidePanelState,
  target: SidePanelMode,
  showing = mode === target
): SidePanelState => ({ mode: target, open: showing ? !open : true });

export const toggledSettingsPanel = (state: SidePanelState, current: SettingsTab, target?: SettingsTab) =>
  toggledSidePanel(state, 'settings', state.mode === 'settings' && (!target || target === current));

export const sidePanelModeLabel = (mode: SidePanelMode) => (mode === 'settings' ? 'Settings' : 'Browser and review');

export const sidePanelModeLayout = (mode: SidePanelMode): SidePanelModeLayout =>
  mode === 'settings' ? settingsSidePanelLayout : browserSidePanelLayout;
