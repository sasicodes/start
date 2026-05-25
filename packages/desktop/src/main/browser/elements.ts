export const browserElementsScript = `
const maxBrowserElementCount = 120;
const interactiveSelector = 'a[href], button, input, textarea, select, summary, [role="button"], [role="link"], [contenteditable="true"]';
const isVisible = (element) => {
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
};
const browserElements = () => Array.from(document.querySelectorAll(interactiveSelector)).filter(isVisible).slice(0, maxBrowserElementCount);
const browserElementForRef = (ref) => {
  const match = /^e([1-9]\\d*)$/.exec(String(ref ?? ''));
  if (!match) return null;
  return browserElements()[Number(match[1]) - 1] ?? null;
};
`;
