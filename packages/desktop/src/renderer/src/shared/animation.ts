export const animationActive = (appFocused: boolean, active = true): boolean => appFocused && active;

export const flyoutRisePx = (rowCount: number, index: number, rowStep: number): number =>
  (rowCount - 1 - index) * rowStep;
