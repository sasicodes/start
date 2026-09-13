import { wait } from '@main/browser/utils/wait';
import { withTimeout } from '@main/utils/timeout';
import type { WebContents } from 'electron';

const pollMs = 80;
const readyTimeoutMs = 8000;
const readStateTimeoutMs = 1000;

const documentComplete = async (webContents: WebContents): Promise<boolean> => {
  try {
    const state = await withTimeout(webContents.executeJavaScript('document.readyState', true), readStateTimeoutMs);
    return state === 'complete' || state === 'interactive';
  } catch {
    return false;
  }
};

export const waitForPageReady = async (webContents: WebContents, timeoutMs = readyTimeoutMs): Promise<boolean> => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (webContents.isDestroyed()) return false;
    if (!webContents.isLoading() && !webContents.isWaitingForResponse() && (await documentComplete(webContents)))
      return true;
    await wait(pollMs);
  }

  return false;
};
