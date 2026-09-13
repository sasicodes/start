import { withBrowserCursor } from '@main/browser/cursor/index';
import { browserElementsScript } from '@main/browser/elements';
import { type BrowserPoint, clickMouseAt, insertTextIn, wheelMouseAt } from '@main/browser/input';
import { type BrowserScrollDelta, type BrowserScrollDirection, browserScrollDelta } from '@main/browser/scroll';
import { wait } from '@main/browser/utils/wait';
import { withTimeout } from '@main/utils/timeout';
import type { WebContents } from 'electron';

export interface BrowserInteractionResult {
  ok: boolean;
  error?: string;
}

interface BrowserLocateResult extends BrowserInteractionResult {
  point?: BrowserPoint;
}

const interactionTimeoutMs = 6000;
const settleDelayMs = 120;

const parseInteractionResult = (value: unknown): BrowserInteractionResult => {
  if (!value || typeof value !== 'object') return { ok: false, error: 'Browser action failed.' };

  const result = value as Record<string, unknown>;
  return {
    ok: result.ok === true,
    ...(typeof result.error === 'string' && result.error ? { error: result.error } : {})
  };
};

export const parseLocateResult = (value: unknown): BrowserLocateResult => {
  const base = parseInteractionResult(value);
  if (!base.ok) return base;

  const result = value as Record<string, unknown>;
  if (typeof result.x !== 'number' || typeof result.y !== 'number')
    return { ok: false, error: 'Could not read the element position.' };

  return { ok: true, point: { x: result.x, y: result.y } };
};

const runInteractionScript = async (webContents: WebContents, script: string): Promise<unknown> => {
  try {
    return await withTimeout(webContents.executeJavaScript(script, true), interactionTimeoutMs);
  } catch (error) {
    return { ok: false, error: error instanceof Error && error.message ? error.message : 'Browser action failed.' };
  }
};

const runAction = async (webContents: WebContents, script: string): Promise<BrowserInteractionResult> =>
  parseInteractionResult(await runInteractionScript(webContents, script));

const locateScript = (ref: string) =>
  withBrowserCursor(`
  ${browserElementsScript}
  const element = browserElementForRef(${JSON.stringify(ref)});
  if (!element) return { ok: false, error: 'Element not found. Take a new browser snapshot.' };
  if (element.disabled || element.getAttribute('aria-disabled') === 'true') return { ok: false, error: 'Element is disabled.' };

  for (let attempt = 0; attempt < 3; attempt++) {
    element.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return { ok: false, error: 'Element is not visible.' };

    const x = Math.min(Math.max(rect.left + rect.width / 2, 1), window.innerWidth - 1);
    const y = Math.min(Math.max(rect.top + rect.height / 2, 1), window.innerHeight - 1);
    const hit = document.elementFromPoint(x, y);
    if (hit && hit !== element && !element.contains(hit) && !hit.contains(element))
      return { ok: false, error: 'Element is covered by another element.' };

    await window.__startCursor__?.tapElement(element);
    const current = element.getBoundingClientRect();
    if (Math.abs(current.left - rect.left) > 1 || Math.abs(current.top - rect.top) > 1 ||
        Math.abs(current.width - rect.width) > 1 || Math.abs(current.height - rect.height) > 1) continue;
    const target = document.elementFromPoint(x, y);
    if (target && target !== element && !element.contains(target) && !target.contains(element))
      return { ok: false, error: 'Element is covered by another element.' };
    return { ok: true, x: x, y: y };
  }
  return { ok: false, error: 'Element kept moving. Take a new browser snapshot and retry.' };
`);

const clickFallbackScript = (ref: string) =>
  withBrowserCursor(`
  ${browserElementsScript}
  const element = browserElementForRef(${JSON.stringify(ref)});
  if (!element) return { ok: false, error: 'Element not found. Take a new browser snapshot.' };
  element.focus({ preventScroll: true });
  element.click();
  return { ok: true };
`);

const typeFallbackScript = (ref: string, text: string, clear: boolean) =>
  withBrowserCursor(`
  ${browserElementsScript}
  const element = browserElementForRef(${JSON.stringify(ref)});
  const text = ${JSON.stringify(text)};
  const clear = ${JSON.stringify(clear)};
  if (!element) return { ok: false, error: 'Element not found. Take a new browser snapshot.' };
  element.focus({ preventScroll: true });

  const nativeSetter = (node) => {
    const prototype = node instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    return Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
  };

  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    const value = clear ? text : element.value + text;
    const setter = nativeSetter(element);
    if (setter) setter.call(element, value);
    else element.value = value;
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
`);

const selectFocusedScript = `
(() => {
  const element = document.activeElement;
  if (!element) return { ok: false };
  if (typeof element.select === 'function') {
    element.select();
    return { ok: true };
  }
  if (element.isContentEditable) {
    document.getSelection()?.selectAllChildren(element);
    return { ok: true };
  }
  return { ok: false };
})()
`;

const scrollAnchorScript = withBrowserCursor(`
  const x = Math.round(window.innerWidth / 2);
  const y = Math.round(window.innerHeight / 2);
  await window.__startCursor__?.moveTo(x, y);
  return { ok: true, x: x, y: y };
`);

const scrollOffsetScript = `
(() => {
  const node = document.elementFromPoint(Math.round(window.innerWidth / 2), Math.round(window.innerHeight / 2));
  let scroller = node;
  while (scroller && scroller !== document.body && scroller !== document.documentElement) {
    if (scroller.scrollHeight > scroller.clientHeight + 1 || scroller.scrollWidth > scroller.clientWidth + 1) break;
    scroller = scroller.parentElement;
  }
  const target = scroller && scroller !== document.body && scroller !== document.documentElement
    ? scroller
    : document.scrollingElement || document.documentElement;
  return { top: target.scrollTop, left: target.scrollLeft };
})()
`;

const fallbackScrollScript = (delta: BrowserScrollDelta) => `
(() => {
  const target = document.scrollingElement || document.documentElement;
  target.scrollBy({ left: ${delta.x}, top: ${delta.y}, behavior: 'instant' });
  return { ok: true };
})()
`;

const scrollOffset = async (webContents: WebContents) => {
  const value = await runInteractionScript(webContents, scrollOffsetScript);
  if (!value || typeof value !== 'object') return null;
  const offset = value as Record<string, unknown>;
  if (typeof offset.top !== 'number' || typeof offset.left !== 'number') return null;
  return { top: offset.top, left: offset.left };
};

const locateBrowserElement = async (webContents: WebContents, ref: string): Promise<BrowserLocateResult> =>
  parseLocateResult(await runInteractionScript(webContents, locateScript(ref)));

export const clickBrowserElement = async (webContents: WebContents, ref: string): Promise<BrowserInteractionResult> => {
  const located = await locateBrowserElement(webContents, ref);
  if (!located.ok || !located.point) return located;

  if (await clickMouseAt(webContents, located.point)) return { ok: true };
  return runAction(webContents, clickFallbackScript(ref));
};

export const typeBrowserText = async (
  webContents: WebContents,
  ref: string,
  text: string,
  clear: boolean
): Promise<BrowserInteractionResult> => {
  const located = await locateBrowserElement(webContents, ref);
  if (!located.ok || !located.point) return located;

  const focused = await clickMouseAt(webContents, located.point);
  if (focused) {
    if (clear) await runAction(webContents, selectFocusedScript);
    if (await insertTextIn(webContents, text)) return { ok: true };
  }

  return runAction(webContents, typeFallbackScript(ref, text, clear));
};

export const scrollBrowserPage = async (
  webContents: WebContents,
  direction: BrowserScrollDirection,
  amount?: number
): Promise<BrowserInteractionResult> => {
  const delta = browserScrollDelta(direction, amount);
  const anchor = parseLocateResult(await runInteractionScript(webContents, scrollAnchorScript));
  if (!anchor.ok || !anchor.point) return anchor;

  const before = await scrollOffset(webContents);
  const wheeled = await wheelMouseAt(webContents, anchor.point, delta);
  if (!wheeled) {
    const fallback = await runAction(webContents, fallbackScrollScript(delta));
    if (!fallback.ok) return fallback;
  }
  await wait(settleDelayMs);

  const after = await scrollOffset(webContents);
  if (before && after && before.top === after.top && before.left === after.left)
    return { ok: false, error: 'The page did not scroll any further.' };

  return { ok: true };
};
