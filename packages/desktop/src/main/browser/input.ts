import { attachCdp, sendCdp } from '@main/browser/cdp';
import type { BrowserKey } from '@main/browser/keys';
import type { BrowserScrollDelta } from '@main/browser/scroll';
import { wait } from '@main/browser/utils/wait';
import { browserInputPoint } from '@main/browser/viewport';
import { withTimeout } from '@main/utils/timeout';
import type { WebContents } from 'electron';

export interface BrowserPoint {
  x: number;
  y: number;
}

const pressDelayMs = 24;

interface MouseEvent extends BrowserPoint {
  type: 'mouseMoved' | 'mousePressed' | 'mouseReleased' | 'mouseWheel';
  button?: 'left' | 'none';
  buttons?: number;
  clickCount?: number;
  deltaX?: number;
  deltaY?: number;
}

const mouseEvent = async (webContents: WebContents, params: MouseEvent) => {
  if (!attachCdp(webContents)) return null;
  const type = params.type === 'mouseWheel' ? 'wheel' : params.type === 'mousePressed' ? 'pointerdown' : 'pointermove';
  if (params.type !== 'mouseReleased') {
    const registered = await withTimeout(
      webContents
        .executeJavaScript(
          `window.__startCursor__?.expectInput(${JSON.stringify(type)}, ${JSON.stringify(params.x)}, ${JSON.stringify(params.y)});`,
          true
        )
        .then(() => true)
        .catch(() => false),
      1000
    );
    if (!registered) throw new Error('Browser input preparation timed out or failed. Take a fresh snapshot and retry.');
  }
  const result = await sendCdp(webContents, 'Input.dispatchMouseEvent', {
    button: 'none',
    ...params,
    ...browserInputPoint(webContents, params)
  });
  return result;
};

export const clickMouseAt = async (webContents: WebContents, { x, y }: BrowserPoint): Promise<boolean> => {
  if (!attachCdp(webContents)) return false;
  const moved = await mouseEvent(webContents, { x, y, type: 'mouseMoved', buttons: 0 });
  if (moved === null) {
    throw new Error('Browser pointer movement failed. Take a fresh snapshot and retry.');
  }

  const pressed = await mouseEvent(webContents, {
    x,
    y,
    type: 'mousePressed',
    button: 'left',
    buttons: 1,
    clickCount: 1
  });
  await wait(pressDelayMs);
  const released = await mouseEvent(webContents, {
    x,
    y,
    type: 'mouseReleased',
    button: 'left',
    buttons: 0,
    clickCount: 1
  });
  if (released === null) {
    if (!webContents.isDestroyed())
      webContents.sendInputEvent({
        type: 'mouseUp',
        ...browserInputPoint(webContents, { x, y }),
        button: 'left',
        clickCount: 1
      });
  }
  if (pressed === null || released === null)
    throw new Error('Browser click was interrupted. Check the page before retrying.');
  return true;
};

export const wheelMouseAt = async (
  webContents: WebContents,
  { x, y }: BrowserPoint,
  delta: BrowserScrollDelta
): Promise<boolean> => {
  if (!attachCdp(webContents)) return false;
  const result = await mouseEvent(webContents, {
    x,
    y,
    type: 'mouseWheel',
    deltaX: delta.x,
    deltaY: delta.y
  });
  if (result === null) throw new Error('Browser scroll was interrupted. Check the page before retrying.');
  return true;
};

export const pressKeyIn = async (webContents: WebContents, key: BrowserKey): Promise<boolean> => {
  if (!attachCdp(webContents)) return false;
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
  await wait(pressDelayMs);
  const up = await sendCdp(webContents, 'Input.dispatchKeyEvent', { ...base, type: 'keyUp' });
  if (up === null && !webContents.isDestroyed()) webContents.sendInputEvent({ type: 'keyUp', keyCode: code });
  if (down === null || up === null)
    throw new Error('Browser key press was interrupted. Check the page before retrying.');
  return true;
};

export const insertTextIn = async (webContents: WebContents, text: string): Promise<boolean> => {
  if (!attachCdp(webContents)) return false;
  const result = await sendCdp(webContents, 'Input.insertText', { text });
  if (result === null) throw new Error('Browser typing was interrupted. Check the field before retrying.');
  return true;
};
