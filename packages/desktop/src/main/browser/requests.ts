import { randomUUID } from 'node:crypto';
import type { BrowserActionResult, BrowserOpenOptions } from '@main/browser/index';
import { sendToMainWindow } from '@main/window';

interface PendingOpen {
  timer: ReturnType<typeof setTimeout>;
  resolve: (result: BrowserActionResult) => void;
}

const pendingOpens = new Map<string, PendingOpen>();

export const completeBrowserOpen = (requestId: string, result: BrowserActionResult) => {
  const pending = pendingOpens.get(requestId);
  if (!pending) return;
  clearTimeout(pending.timer);
  pendingOpens.delete(requestId);
  pending.resolve(result);
};

export const hasBrowserOpenRequest = (requestId: string) => pendingOpens.has(requestId);

export const requestBrowserOpen = (url: string, options: BrowserOpenOptions): Promise<BrowserActionResult> => {
  if (pendingOpens.size >= 32) throw new Error('Too many pending browser requests. Retry after they finish.');
  const requestId = randomUUID();
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      completeBrowserOpen(requestId, {
        ok: false,
        error: 'Browser navigation timed out. Check browser_status before retrying.'
      });
    }, 15000);
    pendingOpens.set(requestId, { timer, resolve });
    try {
      sendToMainWindow('app:browser-open-request', { ...options, url, requestId });
    } catch {
      completeBrowserOpen(requestId, { ok: false, error: 'Browser window is not available.' });
    }
  });
};
