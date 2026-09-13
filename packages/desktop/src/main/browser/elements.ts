export const browserElementsScript = `
const maxBrowserElementCount = 120;
const interactiveSelector = 'a[href], button, input, textarea, select, summary, [role="button"], [role="link"], [contenteditable="true"]';
const isVisible = (element) => {
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
};
const browserElements = () => Array.from(document.querySelectorAll(interactiveSelector)).filter(isVisible).slice(0, maxBrowserElementCount);
const captureBrowserElements = (snapshotId) => {
  const entries = browserElements().map((element, index) => ['e' + snapshotId + '-' + (index + 1), element]);
  window.__startBrowserElements__ = { url: window.location.href, elements: new Map(entries) };
  return entries;
};
const browserElementForRef = (ref) => {
  const snapshot = window.__startBrowserElements__;
  if (!snapshot || snapshot.url !== window.location.href) return null;
  const element = snapshot.elements.get(ref);
  return element && element.isConnected && element.ownerDocument === document && isVisible(element) ? element : null;
};
`;
