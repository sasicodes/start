import type { ComponentChildren } from 'preact';

export type SidePanelLayoutProps = {
  children: ComponentChildren;
  sidePanel: ComponentChildren;
  sidePanelLabel: string;
  sidePanelVisible: boolean;
  defaultSidePanelWidth?: number;
  maxSidePanelWidth?: number;
  minSidePanelWidth?: number;
  onSidePanelCollapse?: () => void;
};
