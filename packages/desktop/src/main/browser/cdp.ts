import { withTimeout } from '@main/utils/timeout';
import type { WebContents } from 'electron';

const cdpTimeoutMs = 5000;
const attached = new WeakSet<WebContents>();

export const attachCdp = (webContents: WebContents): boolean => {
  if (webContents.isDestroyed()) return false;
  if (attached.has(webContents)) return true;

  try {
    webContents.debugger.attach('1.3');
  } catch {
    return false;
  }

  attached.add(webContents);
  webContents.debugger.once('detach', () => attached.delete(webContents));
  return true;
};

export const sendCdp = async (
  webContents: WebContents,
  method: string,
  params: Record<string, unknown> = {}
): Promise<unknown> => {
  if (!attachCdp(webContents)) return null;

  try {
    const result = await withTimeout(webContents.debugger.sendCommand(method, params), cdpTimeoutMs);
    if (result === null) detachCdp(webContents);
    return result;
  } catch {
    return null;
  }
};

export const detachCdp = (webContents: WebContents) => {
  if (!attached.has(webContents) || webContents.isDestroyed()) return;

  attached.delete(webContents);
  try {
    webContents.debugger.detach();
  } catch {}
};
