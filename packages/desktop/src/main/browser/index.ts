import { isDev } from '@main/application';
import { attachInspectListener, startInspect, stopInspect } from '@main/browser/inspect/index';
import { clickBrowserElement, typeBrowserText } from '@main/browser/interaction';
import { type BrowserSnapshot, readBrowserSnapshot } from '@main/browser/snapshot';
import { pickReusableTab } from '@main/browser/tabs';
import { normalizeBrowserUrl } from '@main/browser/url';
import { sendToRendererWindows } from '@main/window';
import {
  BrowserWindow,
  clipboard,
  type BrowserWindow as ElectronBrowserWindow,
  type Event as ElectronEvent,
  type WebContentsView as ElectronWebContentsView,
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
}

export interface BrowserTypeOptions {
  ref: string;
  text: string;
  clear: boolean;
}

export interface BrowserSnapshotResult extends BrowserActionResult {
  snapshot?: BrowserSnapshot;
}

type OwnerWindowNavigationHandler = (event: ElectronEvent, url: string, inPlace: boolean, mainFrame: boolean) => void;

interface BrowserTab {
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
const allowedKeyCodes = new Set([
  'Tab',
  'End',
  'Home',
  'Enter',
  'Delete',
  'Escape',
  'PageUp',
  'ArrowUp',
  'PageDown',
  'ArrowLeft',
  'ArrowDown',
  'Backspace',
  'ArrowRight'
]);
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

const blankTab = (): BrowserTab | null => {
  for (const tab of browserTabs.values()) {
    if (!tab.loaded) return tab;
  }

  return null;
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

const isInterruptedNavigation = (error: unknown) => String(error).includes('ERR_ABORTED');

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
    ownerWindowNavigationHandler = (_event, _url, _inPlace, mainFrame) => {
      if (mainFrame && ownerWindow === window) closeBrowserTabs();
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
  if (lastBounds) tab.view.setBounds(lastBounds);

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

  const { view } = attachActiveBrowserView(window);
  const scaledBounds = scaleBrowserBounds(bounds, sender.getZoomFactor());
  lastBounds = scaledBounds;
  view.setBounds(scaledBounds);
  return { ok: true, status: statusFromView() };
};

export const openBrowserUrl = async (
  sender: WebContents,
  value: string,
  options: BrowserOpenOptions = {}
): Promise<BrowserActionResult> => {
  const url = normalizeBrowserUrl(value);
  if (!url) return { ok: false, error: 'Enter a valid http or https URL.' };

  const window = windowFromSender(sender);
  if (!window) return { ok: false, error: 'Browser window is not available.' };

  if (options.tabId && browserTabs.has(options.tabId)) {
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
  if (loadError && !isInterruptedNavigation(loadError))
    return { ok: false, error: 'This site cannot be loaded.', status: statusFromView() };

  sendStatus();
  return { ok: true, status: statusFromView() };
};

export const newBrowserTab = (sender: WebContents): BrowserActionResult => {
  const window = windowFromSender(sender);
  if (!window) return { ok: false, error: 'Browser window is not available.' };

  activeTabId = (blankTab() ?? createBrowserTab()).id;
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
  if (!activeTabId && window) createBrowserTab();

  if (activeTabId && window && (wasAttached || ownerWindow === window)) {
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
    const image = await tab.view.webContents.capturePage();
    if (image.isEmpty()) return { ok: false, error: 'Browser screenshot is empty.', status: statusFromView() };

    clipboard.writeImage(image);
    return { ok: true, status: statusFromView() };
  } catch {
    return { ok: false, error: 'Could not capture the browser screenshot.', status: statusFromView() };
  }
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

export const pressInBrowser = (key: string): BrowserActionResult => {
  const tab = activeTab();
  if (!tab) return { ok: false, error: closedPanelError, status: statusFromView() };
  if (!allowedKeyCodes.has(key)) return { ok: false, error: 'Unsupported browser key.', status: statusFromView() };

  tab.view.webContents.sendInputEvent({ type: 'keyDown', keyCode: key });
  tab.view.webContents.sendInputEvent({ type: 'keyUp', keyCode: key });
  sendStatus();
  return { ok: true, status: statusFromView() };
};

export const destroyBrowser = () => {
  closeBrowserTabs();
  ownerWindowClosedHandler = null;
};
