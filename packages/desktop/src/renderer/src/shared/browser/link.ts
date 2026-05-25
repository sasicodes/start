export const browserLinkHrefFromAnchor = (anchor: Pick<HTMLAnchorElement, 'href' | 'protocol'>) => {
  if (anchor.protocol === 'http:' || anchor.protocol === 'https:') return anchor.href;
  return '';
};

export const browserLinkHrefFromClick = (event: MouseEvent) => {
  if (event.defaultPrevented || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
    return '';
  if (!(event.target instanceof Element)) return '';

  const anchor = event.target.closest('a[href]');
  if (!(anchor instanceof HTMLAnchorElement)) return '';

  return browserLinkHrefFromAnchor(anchor);
};
