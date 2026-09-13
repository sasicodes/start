import { waitForPageReady } from '@main/browser/ready';
import type { WebContents } from 'electron';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createFakeBrowserWindow } from '../../fakes/electron.js';

afterEach(() => vi.useRealTimers());
describe('page readiness', () => {
  it.each(['complete', 'interactive'])('accepts %s documents', async (state) => {
    const fake = createFakeBrowserWindow().webContents;
    vi.spyOn(fake, 'executeJavaScript').mockResolvedValue(state);
    await expect(waitForPageReady(fake as unknown as WebContents)).resolves.toBe(true);
  });
  it('returns immediately for destroyed pages', async () => {
    const fake = createFakeBrowserWindow().webContents;
    vi.spyOn(fake, 'isDestroyed').mockReturnValue(true);
    await expect(waitForPageReady(fake as unknown as WebContents)).resolves.toBe(false);
  });
  it('bounds pages that never finish loading', async () => {
    vi.useFakeTimers();
    const fake = createFakeBrowserWindow().webContents;
    vi.spyOn(fake, 'isLoading').mockReturnValue(true);
    const result = waitForPageReady(fake as unknown as WebContents, 240);
    await vi.advanceTimersByTimeAsync(320);
    await expect(result).resolves.toBe(false);
  });
  it('bounds unresponsive document scripts', async () => {
    vi.useFakeTimers();
    const fake = createFakeBrowserWindow().webContents;
    vi.spyOn(fake, 'executeJavaScript').mockImplementation(() => new Promise(() => {}));
    const result = waitForPageReady(fake as unknown as WebContents, 500);
    await vi.advanceTimersByTimeAsync(1200);
    await expect(result).resolves.toBe(false);
  });
});
