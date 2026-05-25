import { browserElementsScript } from '@main/browser/elements';
import { withTimeout } from '@main/browser/timeout';
import type { WebContents } from 'electron';

export interface BrowserInteractionResult {
  ok: boolean;
  error?: string;
}

const interactionTimeoutMs = 3000;

const parseInteractionResult = (value: unknown): BrowserInteractionResult => {
  if (!value || typeof value !== 'object') return { ok: false, error: 'Browser action failed.' };

  const result = value as Record<string, unknown>;
  return {
    ok: result.ok === true,
    ...(typeof result.error === 'string' && result.error ? { error: result.error } : {})
  };
};

const runInteractionScript = async (webContents: WebContents, script: string): Promise<BrowserInteractionResult> => {
  try {
    const result = await withTimeout(webContents.executeJavaScript(script, true), interactionTimeoutMs);
    if (!result) return { ok: false, error: 'Browser action timed out.' };
    return parseInteractionResult(result);
  } catch (error) {
    return { ok: false, error: error instanceof Error && error.message ? error.message : 'Browser action failed.' };
  }
};

export const clickBrowserElement = (webContents: WebContents, ref: string): Promise<BrowserInteractionResult> =>
  runInteractionScript(
    webContents,
    `
(() => {
  ${browserElementsScript}
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
  ${browserElementsScript}
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
