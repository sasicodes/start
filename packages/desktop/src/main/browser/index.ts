import { isDev } from '@main/application';
import { detachCdp } from '@main/browser/cdp';
import { hideBrowserCursor } from '@main/browser/cursor/index';
import { pressKeyIn } from '@main/browser/input';
import { attachInspectListener, startInspect, stopInspect } from '@main/browser/inspect/index';
import { clickBrowserElement, scrollBrowserPage, typeBrowserText } from '@main/browser/interaction';
import { browserKey } from '@main/browser/keys';
import { waitForPageReady } from '@main/browser/ready';
import { completeBrowserOpen, hasBrowserOpenRequest } from '@main/browser/requests';
import { type ScreenshotDetail, screenshotSize } from '@main/browser/screenshot';
import type { BrowserScrollDirection } from '@main/browser/scroll';
import { type BrowserSnapshot, readBrowserSnapshot } from '@main/browser/snapshot';
import { pickReusableTab } from '@main/browser/tabs';
import { normalizeBrowserUrl } from '@main/browser/url';
import {
  type BrowserViewportMetrics,
  browserViewportMetrics,
  captureViewportPng,
  clearBrowserViewport,
  fitBrowserViewport,
  setBrowserViewport
} from '@main/browser/viewport';
import { withTimeout } from '@main/utils/timeout';
import { sendToRendererWindows } from '@main/window';
import {
  BrowserWindow,
  ClipboardItem,
  clipboard,
  type BrowserWindow as ElectronBrowserWindow,
  type Event as ElectronEvent,
  type WebContentsView as ElectronWebContentsView,
  nativeImage,
  shell,
  type WebContents,
  WebContentsView
} from 'electron';

export interface BrowserBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BrowserStatus {
  url: string;
  open: boolean;
  title: string;
  loading: boolean;
  canGoBack: boolean;
  activeTabId: string;
  canGoForward: boolean;
  tabs: BrowserTabStatus[];
}

export interface BrowserTabStatus {
  id: string;
  url: string;
  title: string;
  loading: boolean;
}

export interface BrowserActionResult {
  ok: boolean;
  error?: string;
  status?: BrowserStatus;
}

export interface BrowserOpenOptions {
  tabId?: string;
  newTab?: boolean;
  requestId?: string;
}

export interface BrowserTypeOptions {
  ref: string;
  text: string;
  clear: boolean;
}

export interface BrowserSnapshotResult extends BrowserActionResult {
  snapshot?: BrowserSnapshot;
}

export interface BrowserScreenshotResult extends BrowserActionResult {
  image?: string;
}

type OwnerWindowNavigationHandler = (event: ElectronEvent, url: string, inPlace: boolean, mainFrame: boolean) => void;

interface BrowserTab {
  viewport?: BrowserViewportMetrics;
  id: string;
  loaded: boolean;
  lastUsedOrder: number;
  view: ElectronWebContentsView;
}

let nextBrowserTabId = 1;
let activeTabId = '';
let attachedTabId = '';
let browserTabUseOrder = 0;
let lastBounds: BrowserBounds | null = null;
let statusBroadcastTimer: ReturnType<typeof setTimeout> | null = null;
let ownerWindow: ElectronBrowserWindow | null = null;
let ownerWindowClosedHandler: (() => void) | null = null;
let ownerWindowGoneHandler: (() => void) | null = null;
let ownerWindowNavigationHandler: OwnerWindowNavigationHandler | null = null;
const browserTabs = new Map<string, BrowserTab>();

const browserPartition = 'start-browser';
const closedPanelError = 'Open the in-app browser panel first.';
const maxBrowserTabs = 8;
const statusBroadcastDelayMs = 80;
const actionReadyTimeoutMs = 3000;
const emptyStatus: BrowserStatus = {
  url: '',
  open: false,
  title: '',
  loading: false,
  canGoBack: false,
  activeTabId: '',
  canGoForward: false,
  tabs: []
};

const scaleBrowserBounds = (bounds: BrowserBounds, scale: number): BrowserBounds => ({
  x: Math.round(bounds.x * scale),
  y: Math.round(bounds.y * scale),
  width: Math.max(0, Math.round(bounds.width * scale)),
  height: Math.max(0, Math.round(bounds.height * scale))
});

const tabStatus = (tab: BrowserTab): BrowserTabStatus => ({
  id: tab.id,
  url: tab.view.webContents.getURL(),
  title: tab.view.webContents.getTitle(),
  loading: tab.view.webContents.isLoading()
});

const activeTab = (): BrowserTab | null => browserTabs.get(activeTabId) ?? null;

const touchBrowserTab = (tab: BrowserTab) => {
  browserTabUseOrder += 1;
  tab.lastUsedOrder = browserTabUseOrder;
};

const tabForNewPage = (url: string): BrowserTab => {
  const reusable = pickReusableTab(
    [...browserTabs.values()].map((tab) => ({ tab, blank: !tab.loaded, url: tab.view.webContents.getURL() })),
    url
  );
  return reusable?.tab ?? createBrowserTab();
};

const statusFromView = (): BrowserStatus => {
  const tab = activeTab();
  if (!tab) return emptyStatus;
  const { view } = tab;

  return {
    url: view.webContents.getURL(),
    open: Boolean(ownerWindow && !ownerWindow.isDestroyed()),
    title: view.webContents.getTitle(),
    loading: view.webContents.isLoading(),
    canGoBack: view.webContents.navigationHistory.canGoBack(),
    activeTabId: tab.id,
    canGoForward: view.webContents.navigationHistory.canGoForward(),
    tabs: Array.from(browserTabs.values(), tabStatus)
  };
};

const broadcastStatus = () => {
  sendToRendererWindows('app:browser-status', statusFromView());
};

const sendStatus = () => {
  if (statusBroadcastTimer) return;
  statusBroadcastTimer = setTimeout(() => {
    statusBroadcastTimer = null;
    broadcastStatus();
  }, statusBroadcastDelayMs);
};

const clearPendingStatusBroadcast = () => {
  if (!statusBroadcastTimer) return;
  clearTimeout(statusBroadcastTimer);
  statusBroadcastTimer = null;
};

const externalUrl = (url: string) => {
  if (url.startsWith('mailto:')) shell.openExternal(url).catch(() => {});
};

const createBrowserView = () => {
  const view = new WebContentsView({
    webPreferences: {
      sandbox: true,
      devTools: isDev,
      spellcheck: false,
      webSecurity: true,
      contextIsolation: true,
      nodeIntegration: false,
      partition: browserPartition,
      backgroundThrottling: true
    }
  });
  view.webContents.session.setPermissionCheckHandler(() => false);
  view.webContents.session.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  view.setBackgroundColor('#00000000');
  view.webContents.setWindowOpenHandler(({ url }) => {
    const normalized = normalizeBrowserUrl(url);
    if (normalized && ownerWindow && !ownerWindow.isDestroyed())
      openBrowserUrl(ownerWindow.webContents, normalized, { newTab: true }).catch(() => {});
    else externalUrl(url);
    return { action: 'deny' };
  });
  view.webContents.on('did-finish-load', sendStatus);
  view.webContents.on('did-start-loading', sendStatus);
  view.webContents.on('did-stop-loading', sendStatus);
  view.webContents.on('did-navigate', sendStatus);
  view.webContents.on('did-navigate-in-page', sendStatus);
  view.webContents.on('page-title-updated', sendStatus);
  attachInspectListener(view.webContents);
  return view;
};

const createBrowserTab = (): BrowserTab => {
  const tab = {
    loaded: false,
    lastUsedOrder: 0,
    view: createBrowserView(),
    id: `tab-${nextBrowserTabId}`
  };
  touchBrowserTab(tab);
  nextBrowserTabId += 1;
  browserTabs.set(tab.id, tab);
  activeTabId = tab.id;
  return tab;
};

const ensureActiveTab = (): BrowserTab => activeTab() ?? createBrowserTab();

const nextActiveTabIdAfterClose = (tabId: string) => {
  const tabIds = Array.from(browserTabs.keys());
  const index = tabIds.indexOf(tabId);
  if (index < 0) return '';
  return tabIds[index + 1] ?? tabIds[index - 1] ?? '';
};

const detachAttachedTab = () => {
  const tab = browserTabs.get(attachedTabId);
  if (ownerWindow && tab && !ownerWindow.isDestroyed()) ownerWindow.contentView.removeChildView(tab.view);
  if (tab && !tab.view.webContents.isDestroyed()) tab.view.webContents.setAudioMuted(true);
  attachedTabId = '';
};

const closeBrowserTabById = (tabId: string) => {
  const tab = browserTabs.get(tabId);
  if (!tab) return false;

  detachCdp(tab.view.webContents);

  const nextTabId = activeTabId === tabId ? nextActiveTabIdAfterClose(tabId) : activeTabId;
  if (attachedTabId === tabId) detachAttachedTab();
  browserTabs.delete(tabId);
  tab.view.webContents.stop();
  tab.view.webContents.close();
  activeTabId = nextTabId;
  return true;
};

const closeInactiveBrowserTabsOverLimit = () => {
  while (browserTabs.size > maxBrowserTabs) {
    const tab = [...browserTabs.values()]
      .filter((item) => item.id !== activeTabId)
      .sort((first, second) => first.lastUsedOrder - second.lastUsedOrder)[0];
    if (!tab) return;
    closeBrowserTabById(tab.id);
  }
};

const detachBrowserWindow = () => {
  if (ownerWindowClosedHandler && ownerWindow && !ownerWindow.isDestroyed()) {
    ownerWindow.off('closed', ownerWindowClosedHandler);
  }
  if (ownerWindowGoneHandler && ownerWindow && !ownerWindow.isDestroyed()) {
    ownerWindow.webContents.off('render-process-gone', ownerWindowGoneHandler);
  }
  if (ownerWindowNavigationHandler && ownerWindow && !ownerWindow.isDestroyed()) {
    ownerWindow.webContents.off('did-start-navigation', ownerWindowNavigationHandler);
  }

  detachAttachedTab();

  ownerWindow = null;
  ownerWindowClosedHandler = null;
  ownerWindowGoneHandler = null;
  ownerWindowNavigationHandler = null;
};

const closeBrowserTabs = () => {
  if (browserTabs.size === 0 && !ownerWindow) return;
  clearPendingStatusBroadcast();
  detachBrowserWindow();
  for (const tab of browserTabs.values()) {
    detachCdp(tab.view.webContents);
    tab.view.webContents.stop();
    tab.view.webContents.close();
  }
  browserTabs.clear();
  activeTabId = '';
  nextBrowserTabId = 1;
  lastBounds = null;
  browserTabUseOrder = 0;
  broadcastStatus();
  sendToRendererWindows('app:browser-inspect-state', false);
};

const applyBrowserLayout = (tab: BrowserTab, bounds: BrowserBounds): boolean => {
  if (!tab.viewport) {
    tab.view.setBounds(bounds);
    return true;
  }
  const fitted = fitBrowserViewport(bounds, tab.viewport);
  tab.view.setBounds(fitted.bounds);
  return setBrowserViewport(tab.view.webContents, tab.viewport, fitted.scale);
};

const attachActiveBrowserView = (window: ElectronBrowserWindow) => {
  const tab = ensureActiveTab();
  if (ownerWindow === window && attachedTabId === tab.id) {
    touchBrowserTab(tab);
    return tab;
  }

  if (ownerWindow !== window) {
    detachBrowserWindow();

    ownerWindow = window;
    ownerWindowClosedHandler = () => {
      if (ownerWindow === window) closeBrowserTabs();
    };
    ownerWindowGoneHandler = () => {
      if (ownerWindow === window) closeBrowserTabs();
    };
    ownerWindowNavigationHandler = (_event, _url, inPlace, mainFrame) => {
      if (!inPlace && mainFrame && ownerWindow === window) closeBrowserTabs();
    };

    window.on('closed', ownerWindowClosedHandler);
    window.webContents.on('render-process-gone', ownerWindowGoneHandler);
    window.webContents.on('did-start-navigation', ownerWindowNavigationHandler);
  } else {
    detachAttachedTab();
  }

  touchBrowserTab(tab);
  tab.view.webContents.setAudioMuted(false);
  window.contentView.addChildView(tab.view);
  attachedTabId = tab.id;
  if (lastBounds) applyBrowserLayout(tab, lastBounds);

  return tab;
};

const windowFromSender = (sender: WebContents): ElectronBrowserWindow | null => {
  const window = BrowserWindow.fromWebContents(sender);
  if (!window || window.isDestroyed()) return null;
  return window;
};

export const getBrowserStatus = (): BrowserStatus => statusFromView();

export const setBrowserBounds = (sender: WebContents, bounds: BrowserBounds | null): BrowserActionResult => {
  if (!bounds || bounds.width <= 0 || bounds.height <= 0) {
    detachAttachedTab();
    return { ok: true, status: statusFromView() };
  }

  const window = windowFromSender(sender);
  if (!window) return { ok: false, error: 'Browser window is not available.' };

  const tab = attachActiveBrowserView(window);
  const scaledBounds = scaleBrowserBounds(bounds, sender.getZoomFactor());
  lastBounds = scaledBounds;
  if (!applyBrowserLayout(tab, scaledBounds)) {
    clearBrowserViewport(tab.view.webContents);
    delete tab.viewport;
    tab.view.setBounds(scaledBounds);
    return { ok: false, error: 'Viewport preview could not be resized. It has been reset to the panel size.' };
  }
  return { ok: true, status: statusFromView() };
};

const navigateBrowser = async (
  sender: WebContents,
  value: string,
  options: BrowserOpenOptions = {}
): Promise<BrowserActionResult> => {
  const url = normalizeBrowserUrl(value);
  if (!url) return { ok: false, error: 'Enter a valid http, https, or local file URL.' };

  const window = windowFromSender(sender);
  if (!window) return { ok: false, error: 'Browser window is not available.' };

  if (options.tabId && !browserTabs.has(options.tabId))
    return { ok: false, error: 'Browser tab is not available.', status: statusFromView() };

  if (options.tabId) {
    activeTabId = options.tabId;
  } else if (options.newTab) {
    activeTabId = tabForNewPage(url).id;
  }
  closeInactiveBrowserTabsOverLimit();

  const tab = attachActiveBrowserView(window);
  tab.view.webContents.focus();
  if (tab.view.webContents.getURL() === url) {
    sendStatus();
    return { ok: true, status: statusFromView() };
  }

  tab.loaded = true;
  const loadError = await tab.view.webContents
    .loadURL(url)
    .then(() => null)
    .catch((error: unknown) => error);
  if (loadError) return { ok: false, error: 'This site cannot be loaded.', status: statusFromView() };

  await waitForPageReady(tab.view.webContents, actionReadyTimeoutMs);
  sendStatus();
  return { ok: true, status: statusFromView() };
};

export const openBrowserUrl = async (
  sender: WebContents,
  value: string,
  options: BrowserOpenOptions = {}
): Promise<BrowserActionResult> => {
  if (options.requestId && !hasBrowserOpenRequest(options.requestId))
    return { ok: false, error: 'Browser open request expired.' };
  const result = await navigateBrowser(sender, value, options).catch(() => ({
    ok: false,
    error: 'This site cannot be loaded.'
  }));
  if (options.requestId) completeBrowserOpen(options.requestId, result);
  return result;
};

export const newBrowserTab = (sender: WebContents): BrowserActionResult => {
  const window = windowFromSender(sender);
  if (!window) return { ok: false, error: 'Browser window is not available.' };

  activeTabId = createBrowserTab().id;
  closeInactiveBrowserTabsOverLimit();
  attachActiveBrowserView(window);
  sendStatus();
  return { ok: true, status: statusFromView() };
};

export const selectBrowserTab = (sender: WebContents, tabId: string): BrowserActionResult => {
  const window = windowFromSender(sender);
  if (!window) return { ok: false, error: 'Browser window is not available.' };
  if (!browserTabs.has(tabId)) return { ok: false, error: 'Browser tab is not available.', status: statusFromView() };

  activeTabId = tabId;
  attachActiveBrowserView(window);
  activeTab()?.view.webContents.focus();
  sendStatus();
  return { ok: true, status: statusFromView() };
};

export const closeBrowserTab = (sender: WebContents, tabId: string): BrowserActionResult => {
  const tab = browserTabs.get(tabId);
  if (!tab) return { ok: false, error: 'Browser tab is not available.', status: statusFromView() };

  const wasAttached = attachedTabId === tabId;

  closeBrowserTabById(tabId);

  const window = windowFromSender(sender);
  if (!activeTabId) {
    closeBrowserTabs();
    return { ok: true, status: statusFromView() };
  }

  if (window && wasAttached) {
    attachActiveBrowserView(window);
    activeTab()?.view.webContents.focus();
  }

  sendStatus();
  return { ok: true, status: statusFromView() };
};

export const goBackInBrowser = (): BrowserActionResult => {
  const tab = activeTab();
  if (!tab) return { ok: false, error: closedPanelError, status: statusFromView() };
  if (!tab.view.webContents.navigationHistory.canGoBack()) return { ok: true, status: statusFromView() };
  tab.view.webContents.navigationHistory.goBack();
  sendStatus();
  return { ok: true, status: statusFromView() };
};

export const goForwardInBrowser = (): BrowserActionResult => {
  const tab = activeTab();
  if (!tab) return { ok: false, error: closedPanelError, status: statusFromView() };
  if (!tab.view.webContents.navigationHistory.canGoForward()) return { ok: true, status: statusFromView() };
  tab.view.webContents.navigationHistory.goForward();
  sendStatus();
  return { ok: true, status: statusFromView() };
};

export const reloadBrowser = (): BrowserActionResult => {
  const tab = activeTab();
  if (!tab) return { ok: false, error: closedPanelError, status: statusFromView() };
  tab.view.webContents.reload();
  sendStatus();
  return { ok: true, status: statusFromView() };
};

export const stopBrowser = (): BrowserActionResult => {
  const tab = activeTab();
  if (!tab) return { ok: false, error: closedPanelError, status: statusFromView() };
  tab.view.webContents.stop();
  sendStatus();
  return { ok: true, status: statusFromView() };
};

export const startBrowserInspect = (): Promise<BrowserActionResult> =>
  startInspect(activeTab()?.view.webContents ?? null);

export const stopBrowserInspect = (): Promise<BrowserActionResult> =>
  stopInspect(activeTab()?.view.webContents ?? null);

export const captureBrowserScreenshot = async (): Promise<BrowserActionResult> => {
  const tab = activeTab();
  if (!tab) return { ok: false, error: closedPanelError, status: statusFromView() };

  try {
    const image = await withTimeout(tab.view.webContents.capturePage(), 5000);
    if (!image)
      return {
        ok: false,
        error: 'Browser screenshot timed out. Try again after the page responds.',
        status: statusFromView()
      };
    if (image.isEmpty()) return { ok: false, error: 'Browser screenshot is empty.', status: statusFromView() };

    await clipboard.write([
      new ClipboardItem({ 'image/png': new Blob([new Uint8Array(image.toPNG())], { type: 'image/png' }) })
    ]);
    return { ok: true, status: statusFromView() };
  } catch {
    return { ok: false, error: 'Could not capture the browser screenshot.', status: statusFromView() };
  }
};

export const readBrowserScreenshot = async (
  detail: ScreenshotDetail = 'standard'
): Promise<BrowserScreenshotResult> => {
  const tab = activeTab();
  if (!tab) return { ok: false, error: closedPanelError, status: statusFromView() };

  try {
    const png = await captureViewportPng(tab.view.webContents);
    const image = png ? nativeImage.createFromBuffer(png) : await withTimeout(tab.view.webContents.capturePage(), 5000);
    if (!image)
      return {
        ok: false,
        error: 'Browser screenshot timed out. Try again after the page responds.',
        status: statusFromView()
      };
    if (image.isEmpty()) return { ok: false, error: 'Browser screenshot is empty.', status: statusFromView() };

    const source = image.getSize();
    const size = screenshotSize(source.width, source.height, detail);
    const scaled = size.width !== source.width || size.height !== source.height ? image.resize(size) : image;
    return { ok: true, image: scaled.toPNG().toString('base64'), status: statusFromView() };
  } catch {
    return { ok: false, error: 'Could not capture the browser screenshot.', status: statusFromView() };
  }
};

export const resizeBrowserViewport = async (width: number, height?: number): Promise<BrowserActionResult> => {
  const tab = activeTab();
  if (!tab) return { ok: false, error: closedPanelError, status: statusFromView() };

  const metrics = browserViewportMetrics(width, height);
  if (!lastBounds) return { ok: false, error: 'Open the browser panel before resizing its viewport.' };
  tab.viewport = metrics;
  if (!applyBrowserLayout(tab, lastBounds)) {
    delete tab.viewport;
    clearBrowserViewport(tab.view.webContents);
    tab.view.setBounds(lastBounds);
    return { ok: false, error: 'Could not emulate that viewport size.', status: statusFromView() };
  }

  await waitForPageReady(tab.view.webContents, actionReadyTimeoutMs);
  return { ok: true, status: statusFromView() };
};

export const resetBrowserViewport = async (): Promise<BrowserActionResult> => {
  const tab = activeTab();
  if (!tab) return { ok: false, error: closedPanelError, status: statusFromView() };

  if (!clearBrowserViewport(tab.view.webContents))
    return { ok: false, error: 'Could not reset the viewport size.', status: statusFromView() };
  delete tab.viewport;
  if (lastBounds) tab.view.setBounds(lastBounds);

  return { ok: true, status: statusFromView() };
};

export const captureBrowserSnapshot = async (): Promise<BrowserSnapshotResult> => {
  const tab = activeTab();
  if (!tab) return { ok: false, error: closedPanelError, status: statusFromView() };

  const snapshot = await readBrowserSnapshot(tab.view.webContents);
  if (!snapshot) return { ok: false, error: 'Could not read the browser page.' };

  return { ok: true, snapshot, status: statusFromView() };
};

export const clickInBrowser = async (ref: string): Promise<BrowserActionResult> => {
  const tab = activeTab();
  if (!tab) return { ok: false, error: closedPanelError, status: statusFromView() };

  const result = await clickBrowserElement(tab.view.webContents, ref);
  if (!result.ok)
    return { ok: false, error: result.error ?? 'Could not click the browser element.', status: statusFromView() };

  await waitForPageReady(tab.view.webContents, actionReadyTimeoutMs);
  sendStatus();
  return { ok: true, status: statusFromView() };
};

export const typeInBrowser = async ({ ref, text, clear }: BrowserTypeOptions): Promise<BrowserActionResult> => {
  const tab = activeTab();
  if (!tab) return { ok: false, error: closedPanelError, status: statusFromView() };

  const result = await typeBrowserText(tab.view.webContents, ref, text, clear);
  if (!result.ok)
    return { ok: false, error: result.error ?? 'Could not type into the browser element.', status: statusFromView() };

  sendStatus();
  return { ok: true, status: statusFromView() };
};

export const releaseBrowserControl = () => {
  for (const tab of browserTabs.values()) {
    hideBrowserCursor(tab.view.webContents);
    if (tab.viewport) {
      clearBrowserViewport(tab.view.webContents);
      delete tab.viewport;
      if (lastBounds) tab.view.setBounds(lastBounds);
    }
    detachCdp(tab.view.webContents);
  }
};

export const scrollInBrowser = async (
  direction: BrowserScrollDirection,
  amount?: number
): Promise<BrowserActionResult> => {
  const tab = activeTab();
  if (!tab) return { ok: false, error: closedPanelError, status: statusFromView() };

  const result = await scrollBrowserPage(tab.view.webContents, direction, amount);
  if (!result.ok)
    return { ok: false, error: result.error ?? 'Could not scroll the browser page.', status: statusFromView() };

  sendStatus();
  return { ok: true, status: statusFromView() };
};

export const pressInBrowser = async (key: string): Promise<BrowserActionResult> => {
  const tab = activeTab();
  if (!tab) return { ok: false, error: closedPanelError, status: statusFromView() };

  const stroke = browserKey(key);
  if (!stroke) return { ok: false, error: 'Unsupported browser key.', status: statusFromView() };

  try {
    if (!(await pressKeyIn(tab.view.webContents, stroke))) {
      const modifiers = (['alt', 'control', 'meta', 'shift'] as const).filter(
        (_name, index) => stroke.modifiers & (1 << index)
      );
      tab.view.webContents.sendInputEvent({ type: 'keyDown', keyCode: stroke.code, modifiers });
      tab.view.webContents.sendInputEvent({ type: 'keyUp', keyCode: stroke.code, modifiers });
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Browser key press failed.',
      status: statusFromView()
    };
  }

  await waitForPageReady(tab.view.webContents, actionReadyTimeoutMs);
  sendStatus();
  return { ok: true, status: statusFromView() };
};

export const destroyBrowser = () => {
  closeBrowserTabs();
  ownerWindowClosedHandler = null;
};
