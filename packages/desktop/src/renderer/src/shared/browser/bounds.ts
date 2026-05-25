import type { BrowserBounds } from '@preload/index';

const sameBrowserPosition = (left: BrowserBounds, right: BrowserBounds) => left.x === right.x && left.y === right.y;

const sameBrowserSize = (left: BrowserBounds, right: BrowserBounds) =>
  left.width === right.width && left.height === right.height;

export const browserBoundsEqual = (left: BrowserBounds | null, right: BrowserBounds | null) =>
  Boolean(left && right && sameBrowserPosition(left, right) && sameBrowserSize(left, right));

export const readBrowserBounds = (element: HTMLElement): BrowserBounds => {
  const rect = element.getBoundingClientRect();
  return {
    x: Math.round(rect.left),
    y: Math.round(rect.top),
    width: Math.max(0, Math.round(rect.width)),
    height: Math.max(0, Math.round(rect.height))
  };
};
