import { startInspect, stopInspect } from '@main/browser/inspect/index';
import type { WebContents } from 'electron';
import { describe, expect, it, vi } from 'vitest';

const noPanelError = { ok: false, error: 'Open the in-app browser panel first.' };
const overlayError = { ok: false, error: 'Could not run the inspect overlay.' };

const createInspectWebContents = (executeJavaScript: () => Promise<unknown>) =>
  ({ on: () => {}, executeJavaScript }) as unknown as WebContents;

describe('startInspect', () => {
  it('reports a missing browser panel', async () => {
    await expect(startInspect(null)).resolves.toEqual(noPanelError);
  });

  it('activates the overlay when the page script completes', async () => {
    const webContents = createInspectWebContents(async () => {});

    await expect(startInspect(webContents)).resolves.toEqual({ ok: true });
  });

  it('reports a structured error when the page script throws', async () => {
    const webContents = createInspectWebContents(async () => {
      throw new Error('Script failed to execute');
    });

    await expect(startInspect(webContents)).resolves.toEqual(overlayError);
  });

  it('times out instead of hanging when the page never responds', async () => {
    vi.useFakeTimers();
    try {
      const webContents = createInspectWebContents(() => new Promise(() => {}));
      const pending = startInspect(webContents);

      await vi.advanceTimersByTimeAsync(3000);

      await expect(pending).resolves.toEqual(overlayError);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('stopInspect', () => {
  it('reports a missing browser panel', async () => {
    await expect(stopInspect(null)).resolves.toEqual(noPanelError);
  });

  it('deactivates the overlay when the page script completes', async () => {
    const webContents = createInspectWebContents(async () => {});

    await expect(stopInspect(webContents)).resolves.toEqual({ ok: true });
  });

  it('times out instead of hanging when the page never responds', async () => {
    vi.useFakeTimers();
    try {
      const webContents = createInspectWebContents(() => new Promise(() => {}));
      const pending = stopInspect(webContents);

      await vi.advanceTimersByTimeAsync(3000);

      await expect(pending).resolves.toEqual(overlayError);
    } finally {
      vi.useRealTimers();
    }
  });
});
