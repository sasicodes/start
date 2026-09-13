import { attachCdp, sendCdp } from '@main/browser/cdp';
import type { BrowserKey } from '@main/browser/keys';
import type { BrowserScrollDelta } from '@main/browser/scroll';
import { wait } from '@main/browser/utils/wait';
import type { WebContents } from 'electron';

export interface BrowserPoint {
  x: number;
  y: number;
}

const pressDelayMs = 24;

const mouseEvent = async (webContents: WebContents, params: Record<string, unknown>) => {
  if (!attachCdp(webContents)) return null;
  const type = params.type === 'mouseWheel' ? 'wheel' : params.type === 'mousePressed' ? 'pointerdown' : 'pointermove';
  if (params.type !== 'mouseReleased') {
    await webContents
      .executeJavaScript(
        `window.__startCursor__?.expectInput(${JSON.stringify(type)}, ${JSON.stringify(params.x)}, ${JSON.stringify(params.y)});`,
        true
      )
      .catch(() => {});
  }
  const result = await sendCdp(webContents, 'Input.dispatchMouseEvent', { button: 'none', ...params });
  if (result === null) {
    await webContents.executeJavaScript("window.__startCursor__?.expectInput('', 0, 0);", true).catch(() => {});
  }
  return result;
};

export const clickMouseAt = async (webContents: WebContents, { x, y }: BrowserPoint): Promise<boolean> => {
  const moved = await mouseEvent(webContents, { x, y, type: 'mouseMoved', buttons: 0 });
  if (moved === null) return false;

  await mouseEvent(webContents, { x, y, type: 'mousePressed', button: 'left', buttons: 1, clickCount: 1 });
  await wait(pressDelayMs);
  await mouseEvent(webContents, { x, y, type: 'mouseReleased', button: 'left', buttons: 0, clickCount: 1 });
  return true;
};

export const wheelMouseAt = async (
  webContents: WebContents,
  { x, y }: BrowserPoint,
  delta: BrowserScrollDelta
): Promise<boolean> => {
  const result = await mouseEvent(webContents, {
    x,
    y,
    type: 'mouseWheel',
    deltaX: delta.x,
    deltaY: delta.y
  });
  return result !== null;
};

export const pressKeyIn = async (webContents: WebContents, key: BrowserKey): Promise<boolean> => {
  const { code, keyCode, modifiers } = key;
  const text = modifiers & 7 ? '' : key.text;
  const base = {
    code,
    modifiers,
    key: key.key,
    windowsVirtualKeyCode: keyCode,
    nativeVirtualKeyCode: keyCode
  };

  const down = await sendCdp(webContents, 'Input.dispatchKeyEvent', {
    ...base,
    type: text ? 'keyDown' : 'rawKeyDown',
    ...(text ? { text } : {})
  });
  if (down === null) return false;

  await wait(pressDelayMs);
  await sendCdp(webContents, 'Input.dispatchKeyEvent', { ...base, type: 'keyUp' });
  return true;
};

export const insertTextIn = async (webContents: WebContents, text: string): Promise<boolean> => {
  const result = await sendCdp(webContents, 'Input.insertText', { text });
  return result !== null;
};
