import { isDev } from '@main/application';
import { attachInspectListener, startInspect, stopInspect } from '@main/browser/inspect/index';
import { clickBrowserElement, typeBrowserText } from '@main/browser/interaction';
import { normalizeBrowserUrl } from '@main/browser/url';
import { readBrowserSnapshot, type BrowserSnapshot } from '@main/browser/snapshot';
import { sendToRendererWindows } from '@main/window';
import {
  shell,
  clipboard,
  BrowserWindow,
  WebContentsView,
  type Event as ElectronEvent,
  type WebContents,
  type BrowserWindow as ElectronBrowserWindow,
  type WebContentsView as ElectronWebContentsView
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
  canGoForward: boolean;
}

export interface BrowserActionResult {
  ok: boolean;
  error?: string;
  status?: BrowserStatus;
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

let browserView: ElectronWebContentsView | null = null;
let ownerWindow: ElectronBrowserWindow | null = null;
let ownerWindowClosedHandler: (() => void) | null = null;
let ownerWindowGoneHandler: (() => void) | null = null;
let ownerWindowNavigationHandler: OwnerWindowNavigationHandler | null = null;
let lastBounds: BrowserBounds | null = null;

const browserPartition = 'start-browser';
const closedPanelError = 'Open the in-app browser panel first.';
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
  'ArrowDown',
  'ArrowLeft',
  'Backspace',
  'ArrowRight'
]);
const emptyStatus: BrowserStatus = {
  url: '',
  open: false,
  title: '',
  loading: false,
  canGoBack: false,
  canGoForward: false
};

const statusFromView = (): BrowserStatus => {
  if (!browserView) return emptyStatus;

  return {
    url: browserView.webContents.getURL(),
    open: Boolean(ownerWindow && !ownerWindow.isDestroyed()),
    title: browserView.webContents.getTitle(),
    loading: browserView.webContents.isLoading(),
    canGoBack: browserView.webContents.navigationHistory.canGoBack(),
    canGoForward: browserView.webContents.navigationHistory.canGoForward()
  };
};

const sendStatus = () => {
  sendToRendererWindows('app:browser-status', statusFromView());
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
      webSecurity: true,
      spellcheck: false,
      nodeIntegration: false,
      contextIsolation: true,
      partition: browserPartition,
      backgroundThrottling: true
    }
  });
  view.setBackgroundColor('#00000000');
  view.webContents.setWindowOpenHandler(({ url }) => {
    const normalized = normalizeBrowserUrl(url);
    if (normalized && ownerWindow && !ownerWindow.isDestroyed())
      void openBrowserUrl(ownerWindow.webContents, normalized);
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

const detachBrowserView = () => {
  if (ownerWindowClosedHandler && ownerWindow && !ownerWindow.isDestroyed()) {
    ownerWindow.off('closed', ownerWindowClosedHandler);
  }
  if (ownerWindowGoneHandler && ownerWindow && !ownerWindow.isDestroyed()) {
    ownerWindow.webContents.off('render-process-gone', ownerWindowGoneHandler);
  }
  if (ownerWindowNavigationHandler && ownerWindow && !ownerWindow.isDestroyed()) {
    ownerWindow.webContents.off('did-start-navigation', ownerWindowNavigationHandler);
  }

  if (ownerWindow && browserView && !ownerWindow.isDestroyed()) ownerWindow.contentView.removeChildView(browserView);

  ownerWindow = null;
  ownerWindowClosedHandler = null;
  ownerWindowGoneHandler = null;
  ownerWindowNavigationHandler = null;
};

const closeBrowserView = () => {
  if (!browserView && !ownerWindow) return;
  detachBrowserView();
  browserView?.webContents.stop();
  browserView?.webContents.close();
  browserView = null;
  lastBounds = null;
  sendStatus();
  sendToRendererWindows('app:browser-inspect-state', false);
};

const attachBrowserView = (window: ElectronBrowserWindow) => {
  if (ownerWindow === window && browserView) return browserView;

  detachBrowserView();

  ownerWindow = window;
  browserView = browserView ?? createBrowserView();
  ownerWindowClosedHandler = () => {
    if (ownerWindow === window) closeBrowserView();
  };
  ownerWindowGoneHandler = () => {
    if (ownerWindow === window) closeBrowserView();
  };
  ownerWindowNavigationHandler = (_event, _url, _inPlace, mainFrame) => {
    if (mainFrame && ownerWindow === window) closeBrowserView();
  };

  window.contentView.addChildView(browserView);
  window.on('closed', ownerWindowClosedHandler);
  window.webContents.on('render-process-gone', ownerWindowGoneHandler);
  window.webContents.on('did-start-navigation', ownerWindowNavigationHandler);
  if (lastBounds) browserView.setBounds(lastBounds);

  return browserView;
};

const windowFromSender = (sender: WebContents): ElectronBrowserWindow | null => {
  const window = BrowserWindow.fromWebContents(sender);
  if (!window || window.isDestroyed()) return null;
  return window;
};

export const getBrowserStatus = (): BrowserStatus => statusFromView();

export const setBrowserBounds = (sender: WebContents, bounds: BrowserBounds | null): BrowserActionResult => {
  if (!bounds || bounds.width <= 0 || bounds.height <= 0) {
    closeBrowserView();
    return { ok: true, status: statusFromView() };
  }

  const window = windowFromSender(sender);
  if (!window) return { ok: false, error: 'Browser window is not available.' };

  const view = attachBrowserView(window);
  lastBounds = bounds;
  view.setBounds(bounds);
  return { ok: true, status: statusFromView() };
};

export const openBrowserUrl = async (sender: WebContents, value: string): Promise<BrowserActionResult> => {
  const url = normalizeBrowserUrl(value);
  if (!url) return { ok: false, error: 'Enter a valid http or https URL.' };

  const window = windowFromSender(sender);
  if (!window) return { ok: false, error: 'Browser window is not available.' };

  const view = attachBrowserView(window);
  view.webContents.focus();
  const loadError = await view.webContents
    .loadURL(url)
    .then(() => null)
    .catch((error: unknown) => error);
  if (loadError && !isInterruptedNavigation(loadError))
    return { ok: false, error: 'This site cannot be loaded.', status: statusFromView() };

  sendStatus();
  return { ok: true, status: statusFromView() };
};

export const goBackInBrowser = (): BrowserActionResult => {
  if (!browserView) return { ok: false, error: closedPanelError, status: statusFromView() };
  if (!browserView.webContents.navigationHistory.canGoBack()) return { ok: true, status: statusFromView() };
  browserView.webContents.navigationHistory.goBack();
  sendStatus();
  return { ok: true, status: statusFromView() };
};

export const goForwardInBrowser = (): BrowserActionResult => {
  if (!browserView) return { ok: false, error: closedPanelError, status: statusFromView() };
  if (!browserView.webContents.navigationHistory.canGoForward()) return { ok: true, status: statusFromView() };
  browserView.webContents.navigationHistory.goForward();
  sendStatus();
  return { ok: true, status: statusFromView() };
};

export const reloadBrowser = (): BrowserActionResult => {
  if (!browserView) return { ok: false, error: closedPanelError, status: statusFromView() };
  browserView.webContents.reload();
  sendStatus();
  return { ok: true, status: statusFromView() };
};

export const stopBrowser = (): BrowserActionResult => {
  if (!browserView) return { ok: false, error: closedPanelError, status: statusFromView() };
  browserView.webContents.stop();
  sendStatus();
  return { ok: true, status: statusFromView() };
};

export const startBrowserInspect = (): Promise<BrowserActionResult> => startInspect(browserView?.webContents ?? null);

export const stopBrowserInspect = (): Promise<BrowserActionResult> => stopInspect(browserView?.webContents ?? null);

export const captureBrowserScreenshot = async (): Promise<BrowserActionResult> => {
  if (!browserView) return { ok: false, error: closedPanelError, status: statusFromView() };

  try {
    const image = await browserView.webContents.capturePage();
    if (image.isEmpty()) return { ok: false, error: 'Browser screenshot is empty.', status: statusFromView() };

    clipboard.writeImage(image);
    return { ok: true, status: statusFromView() };
  } catch {
    return { ok: false, error: 'Could not capture the browser screenshot.', status: statusFromView() };
  }
};

export const captureBrowserSnapshot = async (): Promise<BrowserSnapshotResult> => {
  if (!browserView) return { ok: false, error: closedPanelError, status: statusFromView() };

  const snapshot = await readBrowserSnapshot(browserView.webContents);
  if (!snapshot) return { ok: false, error: 'Could not read the browser page.' };

  return { ok: true, snapshot, status: statusFromView() };
};

export const clickInBrowser = async (ref: string): Promise<BrowserActionResult> => {
  if (!browserView) return { ok: false, error: closedPanelError, status: statusFromView() };

  const result = await clickBrowserElement(browserView.webContents, ref);
  if (!result.ok)
    return { ok: false, error: result.error ?? 'Could not click the browser element.', status: statusFromView() };

  sendStatus();
  return { ok: true, status: statusFromView() };
};

export const typeInBrowser = async ({ ref, text, clear }: BrowserTypeOptions): Promise<BrowserActionResult> => {
  if (!browserView) return { ok: false, error: closedPanelError, status: statusFromView() };

  const result = await typeBrowserText(browserView.webContents, ref, text, clear);
  if (!result.ok)
    return { ok: false, error: result.error ?? 'Could not type into the browser element.', status: statusFromView() };

  sendStatus();
  return { ok: true, status: statusFromView() };
};

export const pressInBrowser = (key: string): BrowserActionResult => {
  if (!browserView) return { ok: false, error: closedPanelError, status: statusFromView() };
  if (!allowedKeyCodes.has(key)) return { ok: false, error: 'Unsupported browser key.', status: statusFromView() };

  browserView.webContents.sendInputEvent({ type: 'keyDown', keyCode: key });
  browserView.webContents.sendInputEvent({ type: 'keyUp', keyCode: key });
  sendStatus();
  return { ok: true, status: statusFromView() };
};

export const destroyBrowser = () => {
  closeBrowserView();
  ownerWindowClosedHandler = null;
};
