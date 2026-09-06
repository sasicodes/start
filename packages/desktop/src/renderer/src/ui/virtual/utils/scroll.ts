import { shouldPreserveScrollEnd } from '@renderer/ui/virtual/geometry';

const scrollOverflowValues = new Set(['auto', 'overlay', 'scroll']);

export const syncScrollEnd = (element: HTMLElement, pinned: boolean, heightDelta: number, threshold: number) => {
  const distanceFromEnd = element.scrollHeight - element.clientHeight - element.scrollTop;
  if (!pinned && !shouldPreserveScrollEnd(distanceFromEnd, heightDelta, threshold)) return false;

  element.scrollTop = element.scrollHeight;
  return true;
};

export const findScrollAncestor = (element: HTMLElement): HTMLElement | null => {
  let parent = element.parentElement;
  while (parent) {
    if (scrollOverflowValues.has(getComputedStyle(parent).overflowY)) return parent;
    parent = parent.parentElement;
  }
  return null;
};
