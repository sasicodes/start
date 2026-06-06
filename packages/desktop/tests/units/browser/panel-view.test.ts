import type { WebContents } from 'electron';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createFakeBrowserWindow, resetFakeBrowserWindows } from '../../fakes/electron.js';
import { broadcastsByChannel, resetBroadcasts } from '../../fakes/window.js';

const {
  captureBrowserScreenshot,
  closeBrowserTab,
  clickInBrowser,
  destroyBrowser,
  openBrowserUrl,
  pressInBrowser,
  reloadBrowser,
  setBrowserBounds,
  selectBrowserTab,
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

  it('detaches the native browser view when panel bounds are cleared', () => {
    const window = createFakeBrowserWindow();
    const webContents = webContentsForTest(window);

    setBrowserBounds(webContents, { x: 10, y: 20, width: 300, height: 200 });
    const view = window.contentView.children[0];
    expect(window.contentView.children).toHaveLength(1);
    expect(view?.backgroundColor).toBe('#00000000');

    setBrowserBounds(webContents, null);
    expect(window.contentView.children).toHaveLength(0);
    expect(view?.webContents.closed).toBe(false);
  });

  it('does not broadcast status when clearing bounds without an attached view', () => {
    const window = createFakeBrowserWindow();
    const webContents = webContentsForTest(window);

    setBrowserBounds(webContents, null);

    expect(window.contentView.children).toHaveLength(0);
    expect(broadcastsByChannel('app:browser-status')).toEqual([]);
  });

  it('reattaches the existing browser view after the panel is reopened', () => {
    const window = createFakeBrowserWindow();
    const webContents = webContentsForTest(window);

    setBrowserBounds(webContents, { x: 10, y: 20, width: 300, height: 200 });
    const view = window.contentView.children[0];

    setBrowserBounds(webContents, null);
    setBrowserBounds(webContents, { x: 12, y: 24, width: 320, height: 220 });

    expect(window.contentView.children).toHaveLength(1);
    expect(window.contentView.children[0]).toBe(view);
  });

  it('opens and switches between separate browser tabs', async () => {
    const window = createFakeBrowserWindow();
    const webContents = webContentsForTest(window);

    setBrowserBounds(webContents, { x: 10, y: 20, width: 300, height: 200 });
    const firstView = window.contentView.children[0];
    if (!firstView) throw new Error('Expected browser view.');

    await openBrowserUrl(webContents, 'https://example.com');
    await openBrowserUrl(webContents, 'https://start.intelligence.one', { newTab: true });
    const secondView = window.contentView.children[0];
    if (!secondView) throw new Error('Expected browser view.');

    expect(secondView).not.toBe(firstView);
    expect(secondView.webContents.getURL()).toBe('https://start.intelligence.one/');
    expect(selectBrowserTab(webContents, 'tab-1').status?.url).toBe('https://example.com/');
    expect(window.contentView.children[0]).toBe(firstView);
  });

  it('reuses an existing browser tab for the same normalized URL', async () => {
    const window = createFakeBrowserWindow();
    const webContents = webContentsForTest(window);

    setBrowserBounds(webContents, { x: 10, y: 20, width: 300, height: 200 });
    const firstView = window.contentView.children[0];
    if (!firstView) throw new Error('Expected browser view.');

    await openBrowserUrl(webContents, 'https://example.com/path#section');
    const result = await openBrowserUrl(webContents, 'https://example.com/path#section', { newTab: true });

    expect(result.status?.activeTabId).toBe('tab-1');
    expect(result.status?.tabs).toHaveLength(1);
    expect(window.contentView.children[0]).toBe(firstView);
  });

  it('opens a new browser tab for a different URL hash', async () => {
    const window = createFakeBrowserWindow();
    const webContents = webContentsForTest(window);

    setBrowserBounds(webContents, { x: 10, y: 20, width: 300, height: 200 });
    const firstView = window.contentView.children[0];
    if (!firstView) throw new Error('Expected browser view.');

    await openBrowserUrl(webContents, 'https://example.com/path#one');
    const result = await openBrowserUrl(webContents, 'https://example.com/path#two', { newTab: true });

    expect(result.status?.activeTabId).toBe('tab-2');
    expect(result.status?.tabs).toHaveLength(2);
    expect(window.contentView.children[0]).not.toBe(firstView);
  });

  it('caps browser tabs by closing the least recently used inactive tab', async () => {
    const window = createFakeBrowserWindow();
    const webContents = webContentsForTest(window);

    setBrowserBounds(webContents, { x: 10, y: 20, width: 300, height: 200 });
    await openBrowserUrl(webContents, 'https://example.com/1');
    await openBrowserUrl(webContents, 'https://example.com/2', { newTab: true });
    const secondView = window.contentView.children[0];
    if (!secondView) throw new Error('Expected browser view.');

    for (const id of [3, 4, 5, 6, 7, 8]) {
      await openBrowserUrl(webContents, `https://example.com/${id}`, { newTab: true });
    }

    selectBrowserTab(webContents, 'tab-1');
    const result = await openBrowserUrl(webContents, 'https://example.com/9', { newTab: true });

    expect(secondView.webContents.closed).toBe(true);
    expect(result.status?.activeTabId).toBe('tab-9');
    expect(result.status?.tabs.map((tab) => tab.id)).toEqual([
      'tab-1',
      'tab-3',
      'tab-4',
      'tab-5',
      'tab-6',
      'tab-7',
      'tab-8',
      'tab-9'
    ]);
  });

  it('closes the active browser tab and selects the next tab', async () => {
    const window = createFakeBrowserWindow();
    const webContents = webContentsForTest(window);

    setBrowserBounds(webContents, { x: 10, y: 20, width: 300, height: 200 });
    const firstView = window.contentView.children[0];
    if (!firstView) throw new Error('Expected browser view.');

    await openBrowserUrl(webContents, 'https://example.com');
    await openBrowserUrl(webContents, 'https://start.intelligence.one', { newTab: true });
    selectBrowserTab(webContents, 'tab-1');
    const result = closeBrowserTab(webContents, 'tab-1');

    expect(firstView.webContents.closed).toBe(true);
    expect(result.status?.activeTabId).toBe('tab-2');
    expect(result.status?.url).toBe('https://start.intelligence.one/');
    expect(window.contentView.children[0]?.webContents.getURL()).toBe('https://start.intelligence.one/');
  });

  it('closes the final browser tab and leaves the panel empty', async () => {
    const window = createFakeBrowserWindow();
    const webContents = webContentsForTest(window);

    setBrowserBounds(webContents, { x: 10, y: 20, width: 300, height: 200 });
    const view = window.contentView.children[0];
    if (!view) throw new Error('Expected browser view.');

    await openBrowserUrl(webContents, 'https://example.com');
    const result = closeBrowserTab(webContents, 'tab-1');

    expect(view.webContents.closed).toBe(true);
    expect(window.contentView.children).toHaveLength(0);
    expect(result.status).toEqual({
      url: '',
      open: false,
      title: '',
      loading: false,
      canGoBack: false,
      activeTabId: '',
      canGoForward: false,
      tabs: []
    });
  });

  it('scales native browser bounds by the owner renderer zoom factor', () => {
    const window = createFakeBrowserWindow();
    const webContents = webContentsForTest(window);
    window.webContents.getZoomFactor = () => 1.25;

    setBrowserBounds(webContents, { x: 10, y: 20, width: 300, height: 200 });

    expect(window.contentView.children[0]?.bounds.at(-1)).toEqual({ x: 13, y: 25, width: 375, height: 250 });
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

  it('keeps browser actions available after the panel is detached', () => {
    const window = createFakeBrowserWindow();
    const webContents = webContentsForTest(window);

    setBrowserBounds(webContents, { x: 10, y: 20, width: 300, height: 200 });
    setBrowserBounds(webContents, null);

    expect(reloadBrowser()).toEqual({
      ok: true,
      status: {
        url: '',
        open: false,
        title: '',
        loading: false,
        canGoBack: false,
        activeTabId: 'tab-1',
        canGoForward: false,
        tabs: [{ id: 'tab-1', url: '', title: '', loading: false }]
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
        activeTabId: 'tab-1',
        canGoForward: false,
        tabs: [{ id: 'tab-1', url: '', title: '', loading: false }]
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
        activeTabId: 'tab-1',
        canGoForward: false,
        tabs: [{ id: 'tab-1', url: '', title: '', loading: false }]
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
        activeTabId: 'tab-1',
        canGoForward: false,
        tabs: [{ id: 'tab-1', url: '', title: '', loading: false }]
      }
    });
  });
});
