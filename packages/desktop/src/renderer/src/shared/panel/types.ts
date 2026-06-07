import type { ComponentChildren } from 'preact';

export interface PanelLayoutProps {
  children: ComponentChildren;
  sidePanel: ComponentChildren;
  sidePanelLabel: string;
  sidePanelVisible: boolean;
  sidePanelResizable: boolean;
  defaultSidePanelWidth?: number;
  maxSidePanelWidthRatio?: number;
  minSidePanelWidthRatio?: number;
  onSidePanelCollapse?: () => void;
}
