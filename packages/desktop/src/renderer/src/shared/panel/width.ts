export type ResizeCursor = 'e-resize' | 'ew-resize' | 'w-resize';

interface ResizeCursorState {
  canCollapse: boolean;
  maxWidth: number;
  minWidth: number;
  width: number;
}

const maxPanelCollapseWidth = 128;
const minPanelCollapseWidth = 80;
const panelCollapseWidthRatio = 0.35;
const panelWidthStorageKey = 'start:panel-width';

export const defaultMaxPanelWidthRatio = 0.7;
export const panelSettleDurationMs = 180;

export const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const getPanelCollapseWidth = (minPanelWidth: number) =>
  Math.min(minPanelWidth, clamp(minPanelWidth * panelCollapseWidthRatio, minPanelCollapseWidth, maxPanelCollapseWidth));

export const getResizeCursor = ({ canCollapse, maxWidth, minWidth, width }: ResizeCursorState): ResizeCursor => {
  const canGrow = width < maxWidth;
  const canShrink = width > minWidth || canCollapse;

  if (!canGrow && canShrink) return 'e-resize';
  if (canGrow && !canShrink) return 'w-resize';
  return 'ew-resize';
};

export const readStoredPanelWidth = () => {
  try {
    const width = Number(window.localStorage.getItem(panelWidthStorageKey));
    if (Number.isFinite(width) && width > 0) return width;
    return;
  } catch {
    return;
  }
};

export const writeStoredPanelWidth = (width: number) => {
  try {
    window.localStorage.setItem(panelWidthStorageKey, `${Math.round(width)}`);
  } catch {
    return;
  }
};
