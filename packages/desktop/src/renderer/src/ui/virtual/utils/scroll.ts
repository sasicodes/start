const scrollOverflowValues = new Set(['auto', 'overlay', 'scroll']);

export const findScrollAncestor = (element: HTMLElement): HTMLElement | null => {
  let parent = element.parentElement;
  while (parent) {
    if (scrollOverflowValues.has(getComputedStyle(parent).overflowY)) return parent;
    parent = parent.parentElement;
  }
  return null;
};
