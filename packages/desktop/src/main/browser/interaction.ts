import type { WebContents } from 'electron';

export interface BrowserInteractionResult {
  ok: boolean;
  error?: string;
}

const interactionTimeoutMs = 3000;

const elementScript = `
const maxElementCount = 120;
const interactiveSelector = 'a[href], button, input, textarea, select, summary, [role="button"], [role="link"], [contenteditable="true"]';
const isVisible = (element) => {
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
};
const browserElements = () => Array.from(document.querySelectorAll(interactiveSelector)).filter(isVisible).slice(0, maxElementCount);
const browserElementForRef = (ref) => {
  const match = /^e([1-9]\\d*)$/.exec(String(ref ?? ''));
  if (!match) return null;
  return browserElements()[Number(match[1]) - 1] ?? null;
};
`;

const parseInteractionResult = (value: unknown): BrowserInteractionResult => {
  if (!value || typeof value !== 'object') return { ok: false, error: 'Browser action failed.' };

  const result = value as Record<string, unknown>;
  return {
    ok: result.ok === true,
    ...(typeof result.error === 'string' && result.error ? { error: result.error } : {})
  };
};

const withTimeout = async <T>(task: Promise<T>): Promise<T | null> => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), interactionTimeoutMs);
  });

  try {
    return await Promise.race([task, timeout]);
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
};

const runInteractionScript = async (webContents: WebContents, script: string): Promise<BrowserInteractionResult> => {
  const result = await withTimeout(webContents.executeJavaScript(script, true));
  if (!result) return { ok: false, error: 'Browser action timed out.' };
  return parseInteractionResult(result);
};

export const clickBrowserElement = (webContents: WebContents, ref: string): Promise<BrowserInteractionResult> =>
  runInteractionScript(
    webContents,
    `
(() => {
  ${elementScript}
  const element = browserElementForRef(${JSON.stringify(ref)});
  if (!element) return { ok: false, error: 'Element not found. Take a new browser snapshot.' };
  if (element.disabled || element.getAttribute('aria-disabled') === 'true') return { ok: false, error: 'Element is disabled.' };
  element.scrollIntoView({ block: 'center', inline: 'center' });
  element.focus({ preventScroll: true });
  element.click();
  return { ok: true };
})()
`
  );

export const typeBrowserText = (
  webContents: WebContents,
  ref: string,
  text: string,
  clear: boolean
): Promise<BrowserInteractionResult> =>
  runInteractionScript(
    webContents,
    `
(() => {
  ${elementScript}
  const element = browserElementForRef(${JSON.stringify(ref)});
  const text = ${JSON.stringify(text)};
  const clear = ${JSON.stringify(clear)};
  if (!element) return { ok: false, error: 'Element not found. Take a new browser snapshot.' };
  if (element.disabled || element.getAttribute('aria-disabled') === 'true') return { ok: false, error: 'Element is disabled.' };
  element.scrollIntoView({ block: 'center', inline: 'center' });
  element.focus({ preventScroll: true });

  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    element.value = clear ? text : element.value + text;
    element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return { ok: true };
  }

  if (element.isContentEditable) {
    element.textContent = clear ? text : (element.textContent || '') + text;
    element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
    return { ok: true };
  }

  return { ok: false, error: 'Element cannot receive typed text.' };
})()
`
  );
