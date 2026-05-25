import { createFakeBrowserWindow, resetFakeBrowserWindows } from '../../fakes/electron.js';
import { broadcastsByChannel, resetBroadcasts } from '../../fakes/window.js';
import type { WebContents } from 'electron';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const {
  captureBrowserScreenshot,
  clickInBrowser,
  destroyBrowser,
  openBrowserUrl,
  pressInBrowser,
  reloadBrowser,
  setBrowserBounds,
  typeInBrowser
} = await import('@main/browser/index');

const webContentsForTest = (window: ReturnType<typeof createFakeBrowserWindow>) =>
  window.webContents as unknown as WebContents;

describe('browser panel view', () => {
  beforeEach(() => {
    resetFakeBrowserWindows();
    resetBroadcasts();
    destroyBrowser();
  });

  afterEach(() => {
    destroyBrowser();
  });

  it('closes the native browser view when panel bounds are cleared', () => {
    const window = createFakeBrowserWindow();
    const webContents = webContentsForTest(window);

    setBrowserBounds(webContents, { x: 10, y: 20, width: 300, height: 200 });
    const view = window.contentView.children[0];
    expect(window.contentView.children).toHaveLength(1);
    expect(view?.backgroundColor).toBe('#00000000');

    setBrowserBounds(webContents, null);
    expect(window.contentView.children).toHaveLength(0);
    expect(view?.webContents.closed).toBe(true);
  });

  it('does not broadcast status when clearing bounds without an attached view', () => {
    const window = createFakeBrowserWindow();
    const webContents = webContentsForTest(window);

    setBrowserBounds(webContents, null);

    expect(window.contentView.children).toHaveLength(0);
    expect(broadcastsByChannel('app:browser-status')).toEqual([]);
  });

  it('creates a fresh browser view after the panel is reopened', () => {
    const window = createFakeBrowserWindow();
    const webContents = webContentsForTest(window);

    setBrowserBounds(webContents, { x: 10, y: 20, width: 300, height: 200 });
    const view = window.contentView.children[0];

    setBrowserBounds(webContents, null);
    setBrowserBounds(webContents, { x: 12, y: 24, width: 320, height: 220 });

    expect(window.contentView.children).toHaveLength(1);
    expect(window.contentView.children[0]).not.toBe(view);
  });

  it('closes the native browser view when the owner renderer reloads', () => {
    const window = createFakeBrowserWindow();
    const webContents = webContentsForTest(window);

    setBrowserBounds(webContents, { x: 10, y: 20, width: 300, height: 200 });
    const view = window.contentView.children[0];
    if (!view) throw new Error('Expected browser view.');

    window.webContents.emit('did-start-navigation', {}, 'http://localhost:5173/', false, true);

    expect(window.contentView.children).toHaveLength(0);
    expect(view.webContents.closed).toBe(true);
  });

  it('keeps the native browser view during owner in-page navigation', () => {
    const window = createFakeBrowserWindow();
    const webContents = webContentsForTest(window);

    setBrowserBounds(webContents, { x: 10, y: 20, width: 300, height: 200 });
    const view = window.contentView.children[0];
    if (!view) throw new Error('Expected browser view.');

    window.webContents.emit('did-start-navigation', {}, 'http://localhost:5173/#session', true, false);

    expect(window.contentView.children).toEqual([view]);
    expect(view.webContents.closed).toBe(false);
  });

  it('closes the native browser view when the owner renderer process exits', () => {
    const window = createFakeBrowserWindow();
    const webContents = webContentsForTest(window);

    setBrowserBounds(webContents, { x: 10, y: 20, width: 300, height: 200 });
    const view = window.contentView.children[0];
    if (!view) throw new Error('Expected browser view.');

    window.webContents.emit('render-process-gone');

    expect(window.contentView.children).toHaveLength(0);
    expect(view.webContents.closed).toBe(true);
  });

  it('refuses browser actions after the panel is closed', () => {
    const window = createFakeBrowserWindow();
    const webContents = webContentsForTest(window);

    setBrowserBounds(webContents, { x: 10, y: 20, width: 300, height: 200 });
    setBrowserBounds(webContents, null);

    expect(reloadBrowser()).toEqual({
      ok: false,
      error: 'Open the in-app browser panel first.',
      status: {
        url: '',
        open: false,
        title: '',
        loading: false,
        canGoBack: false,
        canGoForward: false
      }
    });
  });

  it('returns a structured error when screenshot capture fails', async () => {
    const window = createFakeBrowserWindow();
    const webContents = webContentsForTest(window);

    setBrowserBounds(webContents, { x: 10, y: 20, width: 300, height: 200 });
    const view = window.contentView.children[0];
    if (!view) throw new Error('Expected browser view.');
    view.webContents.capturePage = async () => {
      throw new Error('destroyed');
    };

    await expect(captureBrowserScreenshot()).resolves.toEqual({
      ok: false,
      error: 'Could not capture the browser screenshot.',
      status: {
        url: '',
        open: true,
        title: '',
        loading: false,
        canGoBack: false,
        canGoForward: false
      }
    });
  });

  it('focuses the native browser view before opening a page', async () => {
    const window = createFakeBrowserWindow();
    const webContents = webContentsForTest(window);

    setBrowserBounds(webContents, { x: 10, y: 20, width: 300, height: 200 });
    const view = window.contentView.children[0];
    if (!view) throw new Error('Expected browser view.');

    await openBrowserUrl(webContents, 'https://example.com');

    expect(view.webContents.focusCount).toBe(1);
  });

  it('runs browser element interactions against the native view', async () => {
    const window = createFakeBrowserWindow();
    const webContents = webContentsForTest(window);

    setBrowserBounds(webContents, { x: 10, y: 20, width: 300, height: 200 });
    const view = window.contentView.children[0];
    if (!view) throw new Error('Expected browser view.');

    await expect(clickInBrowser('e1')).resolves.toMatchObject({ ok: true });
    await expect(typeInBrowser({ ref: 'e2', text: 'hello', clear: true })).resolves.toMatchObject({ ok: true });

    expect(view.webContents.inputEvents).toEqual([]);
  });

  it('sends supported browser key presses to the native view', () => {
    const window = createFakeBrowserWindow();
    const webContents = webContentsForTest(window);

    setBrowserBounds(webContents, { x: 10, y: 20, width: 300, height: 200 });
    const view = window.contentView.children[0];
    if (!view) throw new Error('Expected browser view.');

    expect(pressInBrowser('Enter')).toMatchObject({ ok: true });
    expect(view.webContents.inputEvents).toEqual([
      { type: 'keyDown', keyCode: 'Enter' },
      { type: 'keyUp', keyCode: 'Enter' }
    ]);
  });

  it('rejects unsupported browser key presses', () => {
    const window = createFakeBrowserWindow();
    const webContents = webContentsForTest(window);

    setBrowserBounds(webContents, { x: 10, y: 20, width: 300, height: 200 });

    expect(pressInBrowser('A')).toMatchObject({ ok: false, error: 'Unsupported browser key.' });
  });

  it('keeps interrupted browser navigation structured', async () => {
    const window = createFakeBrowserWindow();
    const webContents = webContentsForTest(window);

    setBrowserBounds(webContents, { x: 10, y: 20, width: 300, height: 200 });
    const view = window.contentView.children[0];
    if (!view) throw new Error('Expected browser view.');
    view.webContents.loadURL = async () => {
      throw new Error('ERR_ABORTED');
    };

    await expect(openBrowserUrl(webContents, 'https://example.com')).resolves.toEqual({
      ok: true,
      status: {
        url: '',
        open: true,
        title: '',
        loading: false,
        canGoBack: false,
        canGoForward: false
      }
    });
  });

  it('returns a structured error when browser navigation fails', async () => {
    const window = createFakeBrowserWindow();
    const webContents = webContentsForTest(window);

    setBrowserBounds(webContents, { x: 10, y: 20, width: 300, height: 200 });
    const view = window.contentView.children[0];
    if (!view) throw new Error('Expected browser view.');
    view.webContents.loadURL = async () => {
      throw new Error('ERR_NAME_NOT_RESOLVED');
    };

    await expect(openBrowserUrl(webContents, 'https://example.com')).resolves.toEqual({
      ok: false,
      error: 'This site cannot be loaded.',
      status: {
        url: '',
        open: true,
        title: '',
        loading: false,
        canGoBack: false,
        canGoForward: false
      }
    });
  });
});
