import {
  captureBrowserScreenshot,
  destroyBrowser,
  readBrowserScreenshot,
  releaseBrowserControl,
  resetBrowserViewport,
  resizeBrowserViewport,
  setBrowserBounds
} from '@main/browser/index';
import { browserInputPoint } from '@main/browser/viewport';
import type { WebContents } from 'electron';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clipboard,
  createFakeBrowserWindow,
  FakeClipboardItem,
  resetFakeBrowserWindows
} from '../../fakes/electron.js';

const openView = () => {
  const window = createFakeBrowserWindow();
  setBrowserBounds(window.webContents as unknown as WebContents, { x: 0, y: 0, width: 300, height: 200 });
  const view = window.contentView.children[0];
  if (!view) throw new Error('Expected browser view.');
  return view;
};

describe('captureBrowserScreenshot', () => {
  beforeEach(() => {
    destroyBrowser();
    resetFakeBrowserWindows();
  });

  afterEach(() => {
    destroyBrowser();
  });

  it('writes captured png bytes in a clipboard item', async () => {
    const view = openView();
    const image = await view.webContents.capturePage();
    const bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    const write = vi.spyOn(clipboard, 'write');
    vi.spyOn(view.webContents, 'capturePage').mockResolvedValue({ ...image, toPNG: () => bytes });

    await expect(captureBrowserScreenshot()).resolves.toMatchObject({ ok: true });

    expect(write).toHaveBeenCalledOnce();
    const items = write.mock.calls[0]?.[0];
    expect(items).toHaveLength(1);
    const item = items?.[0];
    if (!item) throw new Error('Expected clipboard item.');
    expect(item).toBeInstanceOf(FakeClipboardItem);
    expect(item.types).toEqual(['image/png']);
    const blob = await item.getType('image/png');
    expect(blob.type).toBe('image/png');
    expect(Buffer.from(await blob.arrayBuffer())).toEqual(bytes);
  });

  it('does not write an empty capture to the clipboard', async () => {
    const view = openView();
    const image = await view.webContents.capturePage();
    const write = vi.spyOn(clipboard, 'write');
    vi.spyOn(view.webContents, 'capturePage').mockResolvedValue({ ...image, isEmpty: () => true });

    await expect(captureBrowserScreenshot()).resolves.toMatchObject({
      ok: false,
      error: 'Browser screenshot is empty.'
    });
    expect(write).not.toHaveBeenCalled();
  });

  it('reports clipboard write failures instead of reporting capture success', async () => {
    openView();
    const write = vi.spyOn(clipboard, 'write').mockRejectedValue(new Error('clipboard unavailable'));

    await expect(captureBrowserScreenshot()).resolves.toMatchObject({
      ok: false,
      error: 'Could not capture the browser screenshot.'
    });
    expect(write).toHaveBeenCalledOnce();
  });
});

describe('readBrowserScreenshot', () => {
  beforeEach(() => {
    destroyBrowser();
    resetFakeBrowserWindows();
  });

  afterEach(() => {
    destroyBrowser();
  });

  it('times out an unresponsive native screenshot fallback', async () => {
    vi.useFakeTimers();
    try {
      const view = openView();
      vi.spyOn(view.webContents.debugger, 'attach').mockImplementation(() => {
        throw new Error('in use');
      });
      vi.spyOn(view.webContents, 'capturePage').mockImplementation(() => new Promise(() => {}));
      const result = readBrowserScreenshot();
      await vi.advanceTimersByTimeAsync(5000);
      await expect(result).resolves.toMatchObject({ ok: false, error: expect.stringContaining('timed out') });
    } finally {
      vi.useRealTimers();
    }
  });

  it('prefers the CDP viewport capture so emulated sizes are captured', async () => {
    const view = openView();
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    const capturePage = vi.spyOn(view.webContents, 'capturePage');
    vi.spyOn(view.webContents.debugger, 'sendCommand').mockResolvedValue({ data: png.toString('base64') });

    await expect(readBrowserScreenshot()).resolves.toMatchObject({ ok: true });
    expect(capturePage).not.toHaveBeenCalled();
  });

  it('falls back to the native capture without the debugger', async () => {
    const view = openView();
    const capturePage = vi.spyOn(view.webContents, 'capturePage');

    await expect(readBrowserScreenshot()).resolves.toMatchObject({ ok: true, image: expect.any(String) });
    expect(capturePage).toHaveBeenCalledOnce();
  });
});

describe('resizeBrowserViewport', () => {
  beforeEach(() => {
    destroyBrowser();
    resetFakeBrowserWindows();
  });

  afterEach(() => {
    destroyBrowser();
  });

  it('updates preview layout and input scaling when the sidebar is resized', async () => {
    const window = createFakeBrowserWindow();
    const sender = window.webContents as unknown as WebContents;
    setBrowserBounds(sender, { x: 600, y: 50, width: 600, height: 700 });
    const view = window.contentView.children[0];
    if (!view) throw new Error('Missing view');
    const contents = view.webContents as unknown as WebContents;
    await resizeBrowserViewport(1280, 900);
    expect(browserInputPoint(contents, { x: 1000, y: 300 })).toEqual({ x: 468.75, y: 140.625 });
    setBrowserBounds(sender, { x: 800, y: 50, width: 400, height: 700 });
    expect(view.bounds.at(-1)).toEqual({ x: 800, y: 259, width: 400, height: 281 });
    expect(browserInputPoint(contents, { x: 1000, y: 300 })).toEqual({ x: 312.5, y: 93.75 });
    setBrowserBounds(sender, { x: 400, y: 50, width: 800, height: 700 });
    expect(view.bounds.at(-1)).toEqual({ x: 400, y: 119, width: 800, height: 562 });
    expect(browserInputPoint(contents, { x: 1000, y: 300 })).toEqual({ x: 625, y: 187.5 });
    await resetBrowserViewport();
    expect(view.bounds.at(-1)).toEqual({ x: 400, y: 50, width: 800, height: 700 });
    expect(browserInputPoint(contents, { x: 1000, y: 300 })).toEqual({ x: 1000, y: 300 });
  });

  it('restores panel bounds when enabling emulation fails', async () => {
    const view = openView();
    vi.spyOn(view.webContents, 'enableDeviceEmulation').mockImplementation(() => {
      throw new Error('unavailable');
    });
    await expect(resizeBrowserViewport(1280, 900)).resolves.toMatchObject({ ok: false });
    expect(view.bounds.at(-1)).toEqual({ x: 0, y: 0, width: 300, height: 200 });
  });

  it('emulates clamped device metrics and clears them again', async () => {
    const view = openView();

    const enable = vi.spyOn(view.webContents, 'enableDeviceEmulation');
    const disable = vi.spyOn(view.webContents, 'disableDeviceEmulation');
    await expect(resizeBrowserViewport(390, 844)).resolves.toMatchObject({ ok: true });
    expect(enable).toHaveBeenCalledWith(
      expect.objectContaining({ viewSize: { width: 390, height: 844 }, scale: 200 / 844 })
    );
    expect(view.bounds.at(-1)).toEqual({ x: 104, y: 0, width: 92, height: 200 });
    await expect(resetBrowserViewport()).resolves.toMatchObject({ ok: true });
    expect(disable).toHaveBeenCalledOnce();
    expect(view.bounds.at(-1)).toEqual({ x: 0, y: 0, width: 300, height: 200 });
  });
  it('releases only owned emulation without opening a debugger', async () => {
    const view = openView();
    const disable = vi.spyOn(view.webContents, 'disableDeviceEmulation');
    releaseBrowserControl();
    expect(disable).not.toHaveBeenCalled();
    expect(view.webContents.debugger.attached).toBe(false);
    await resizeBrowserViewport(1280, 900);
    releaseBrowserControl();
    expect(disable).toHaveBeenCalledOnce();
    expect(view.bounds.at(-1)).toEqual({ x: 0, y: 0, width: 300, height: 200 });
  });
});
