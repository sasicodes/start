import { destroyBrowser, openBrowserUrl, setBrowserBounds } from '@main/browser/index';
import type { WebContents } from 'electron';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createFakeBrowserWindow, resetFakeBrowserWindows } from '../../fakes/electron.js';

describe('browser permissions', () => {
  beforeEach(() => {
    destroyBrowser();
    resetFakeBrowserWindows();
  });

  afterEach(() => destroyBrowser());

  it('denies remote page permissions across tabs without changing the app session', async () => {
    const window = createFakeBrowserWindow();
    const sender = window.webContents as unknown as WebContents;
    setBrowserBounds(sender, { x: 0, y: 0, width: 300, height: 200 });
    const first = window.contentView.children[0];
    if (!first) throw new Error('Expected browser view.');

    await openBrowserUrl(sender, 'https://example.com', { newTab: true });
    await openBrowserUrl(sender, 'https://example.org', { newTab: true });
    const second = window.contentView.children[0];
    if (!second) throw new Error('Expected second browser view.');

    expect(first.webContents.session).toBe(second.webContents.session);
    expect(second.webContents.session).not.toBe(window.webContents.session);
    expect(window.webContents.session.permissionCheckHandler).toBeNull();
    expect(window.webContents.session.permissionRequestHandler).toBeNull();

    const { permissionCheckHandler, permissionRequestHandler } = second.webContents.session;
    if (!permissionCheckHandler || !permissionRequestHandler) throw new Error('Expected permission handlers.');
    const page = second.webContents as unknown as WebContents;
    for (const permission of ['media', 'notifications', 'clipboard-read'] as const) {
      const callback = vi.fn();
      permissionRequestHandler(page, permission, callback, { isMainFrame: true, requestingUrl: 'https://example.org' });
      expect(callback).toHaveBeenCalledExactlyOnceWith(false);
      expect(permissionCheckHandler(page, permission, 'https://example.org', { isMainFrame: true })).toBe(false);
    }
  });
});
