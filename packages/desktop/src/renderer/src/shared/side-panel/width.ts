export type ResizeCursor = 'e-resize' | 'ew-resize' | 'w-resize';

type ResizeCursorState = {
  canCollapse: boolean;
  maxWidth: number;
  minWidth: number;
  width: number;
};

const maxSidePanelCollapseWidth = 128;
const minSidePanelCollapseWidth = 80;
const sidePanelCollapseWidthRatio = 0.35;
const sidePanelWidthStorageKey = 'start:side-panel-width';

export const maxSidePanelWindowRatio = 0.6;
export const sidePanelSettleDurationMs = 180;

export const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const getSidePanelCollapseWidth = (minSidePanelWidth: number) =>
  Math.min(
    minSidePanelWidth,
    clamp(minSidePanelWidth * sidePanelCollapseWidthRatio, minSidePanelCollapseWidth, maxSidePanelCollapseWidth)
  );

export const getResizeCursor = ({ canCollapse, maxWidth, minWidth, width }: ResizeCursorState): ResizeCursor => {
  const canGrow = width < maxWidth;
  const canShrink = width > minWidth || canCollapse;

  if (!canGrow && canShrink) return 'e-resize';
  if (canGrow && !canShrink) return 'w-resize';
  return 'ew-resize';
};

export const readStoredSidePanelWidth = () => {
  try {
    const width = Number(window.localStorage.getItem(sidePanelWidthStorageKey));
    return Number.isFinite(width) && width > 0 ? width : undefined;
  } catch {
    return undefined;
  }
};

export const writeStoredSidePanelWidth = (width: number) => {
  try {
    window.localStorage.setItem(sidePanelWidthStorageKey, `${Math.round(width)}`);
  } catch {
    return;
  }
};
