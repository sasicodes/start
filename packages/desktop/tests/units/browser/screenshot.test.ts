import { captureBrowserScreenshot, destroyBrowser, setBrowserBounds } from '@main/browser/index';
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
