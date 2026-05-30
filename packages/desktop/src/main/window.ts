import { join } from 'node:path';
import { appIconPath, appName, isDev, isMac } from '@main/application';
import { environment } from '@main/environment';
import type { BrowserWindow as ElectronBrowserWindow, BrowserWindowConstructorOptions } from 'electron';
import electron from 'electron';

const { app, BrowserWindow, screen, shell } = electron;

const getRendererUrl = () => (isDev ? (environment.rendererUrl ?? null) : null);

let mainWindow: ElectronBrowserWindow | null = null;
let composerWindow: ElectronBrowserWindow | null = null;
let composerVisible = false;
let composerOpenedFromStart = false;
let composerBlurSuppressionDepth = 0;

const openExternalUrl = (url: string) => {
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:')) {
    shell.openExternal(url).catch(() => {});
  }
};

const loadRenderer = (window: ElectronBrowserWindow, surface: 'composer' | 'main') => {
  const rendererUrl = getRendererUrl();

  if (rendererUrl) {
    const url = new URL(rendererUrl);
    url.searchParams.set('surface', surface);
    window.loadURL(url.toString()).catch(() => {});
  } else {
    window.loadFile(join(__dirname, '../renderer/index.html'), { query: { surface } }).catch(() => {});
  }
};

const activeDisplayWorkArea = () => screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea;

const fitComposerWindowToActiveDisplay = (window: ElectronBrowserWindow) => {
  const nextBounds = activeDisplayWorkArea();
  const currentBounds = window.getBounds();
  if (
    currentBounds.x === nextBounds.x &&
    currentBounds.y === nextBounds.y &&
    currentBounds.width === nextBounds.width &&
    currentBounds.height === nextBounds.height
  ) {
    return;
  }

  window.setBounds(nextBounds, false);
};

export const createMainWindow = (): ElectronBrowserWindow => {
  if (mainWindow && !mainWindow.isDestroyed()) return mainWindow;

  const options: BrowserWindowConstructorOptions = {
    show: false,
    title: appName,
    width: 1280,
    height: 840,
    minWidth: 1040,
    minHeight: 680,
    icon: appIconPath,
    transparent: true,
    backgroundColor: '#00000000',
    titleBarStyle: isMac ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      spellcheck: false,
      devTools: isDev,
      backgroundThrottling: true
    }
  };

  if (isMac) {
    options.vibrancy = 'under-window';
    options.visualEffectState = 'active';
    options.trafficLightPosition = { x: 16, y: 16 };
  }

  const window = new BrowserWindow(options);
  mainWindow = window;

  window.setBackgroundColor('#00000000');
  if (isMac) {
    window.setVibrancy('under-window');
  }

  window.once('ready-to-show', () => {
    window.maximize();
    window.show();
  });

  window.webContents.on('will-navigate', (event, url) => {
    if (url === window.webContents.getURL()) return;
    event.preventDefault();
    openExternalUrl(url);
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    openExternalUrl(url);
    return { action: 'deny' };
  });

  window.on('closed', () => {
    if (mainWindow === window) mainWindow = null;
    if (!isMac) app.quit();
  });

  loadRenderer(window, 'main');

  return window;
};

export const createComposerWindow = (): ElectronBrowserWindow => {
  if (composerWindow && !composerWindow.isDestroyed()) return composerWindow;

  const options: BrowserWindowConstructorOptions = {
    ...activeDisplayWorkArea(),
    show: false,
    title: appName,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    frame: false,
    icon: appIconPath,
    transparent: true,
    alwaysOnTop: true,
    backgroundColor: '#00000000',
    opacity: 0,
    focusable: false,
    hasShadow: false,
    skipTaskbar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      spellcheck: false,
      devTools: isDev,
      backgroundThrottling: false
    }
  };

  if (isMac) {
    options.type = 'panel';
  }

  const window = new BrowserWindow(options);

  composerWindow = window;
  window.setBackgroundColor('#00000000');

  window.once('ready-to-show', () => {
    if (!composerVisible) window.setIgnoreMouseEvents(true);
  });

  window.on('blur', () => {
    if (composerBlurSuppressionDepth === 0) requestHideComposerWindow();
  });

  window.on('closed', () => {
    if (composerWindow === window) {
      composerWindow = null;
      composerVisible = false;
    }
  });

  window.webContents.on('will-navigate', (event, url) => {
    if (url === window.webContents.getURL()) return;
    event.preventDefault();
    openExternalUrl(url);
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    openExternalUrl(url);
    return { action: 'deny' };
  });

  loadRenderer(window, 'composer');
  return window;
};

export const withComposerBlurSuppressed = async <T>(action: () => Promise<T>): Promise<T> => {
  composerBlurSuppressionDepth += 1;
  try {
    return await action();
  } finally {
    composerBlurSuppressionDepth = Math.max(0, composerBlurSuppressionDepth - 1);
  }
};

export const showMainWindow = () => {
  const window = createMainWindow();
  if (window.isMinimized()) window.restore();
  window.show();
  window.focus();
};

export const sendToMainWindow = (channel: string, ...args: unknown[]) => {
  const window = createMainWindow();
  const send = () => window.webContents.send(channel, ...args);

  showMainWindow();
  if (window.webContents.isLoading()) {
    window.webContents.once('did-finish-load', send);
    return;
  }

  send();
};

export const sendToRendererWindows = (channel: string, ...args: unknown[]) => {
  for (const window of [mainWindow, composerWindow]) {
    if (!window || window.isDestroyed()) continue;

    const send = () => window.webContents.send(channel, ...args);
    if (window.webContents.isLoading()) {
      window.webContents.once('did-finish-load', send);
    } else {
      send();
    }
  }
};

type HideComposerWindowOptions = {
  discard?: boolean;
  keepAppActive?: boolean;
};

export const hideComposerWindow = ({ discard = true, keepAppActive = false }: HideComposerWindowOptions = {}) => {
  if (!composerWindow || composerWindow.isDestroyed() || !composerVisible) return;

  const mainWindowVisible = Boolean(mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible());
  const shouldHideApp = isMac && !keepAppActive && !composerOpenedFromStart && !mainWindowVisible;
  composerVisible = false;
  composerOpenedFromStart = false;
  if (discard) composerWindow.webContents.send('app:discard-composer');
  composerWindow.setOpacity(0);
  composerWindow.setFocusable(false);
  composerWindow.setIgnoreMouseEvents(true);
  composerWindow.hide();
  if (shouldHideApp) app.hide();
};

export const requestHideComposerWindow = () => {
  if (!composerWindow || composerWindow.isDestroyed() || !composerVisible) return;

  if (composerWindow.webContents.isLoading()) {
    hideComposerWindow();
    return;
  }

  composerWindow.webContents.send('app:hide-composer-request');
};

export const showComposerWindow = () => {
  composerOpenedFromStart = app.isActive();
  const window = createComposerWindow();
  const sendShowComposer = () => {
    if (composerVisible && composerWindow === window && !window.isDestroyed())
      window.webContents.send('app:show-composer');
  };

  composerVisible = true;
  window.setOpacity(0);
  window.setFocusable(true);
  fitComposerWindowToActiveDisplay(window);
  window.setIgnoreMouseEvents(false);
  if (isMac) {
    window.showInactive();
  } else {
    window.show();
  }
  window.focus();
  window.webContents.focus();
  window.setOpacity(1);
  if (window.webContents.isLoading()) {
    window.webContents.once('did-finish-load', sendShowComposer);
    return;
  }

  sendShowComposer();
};

export const toggleComposerWindow = () => {
  if (composerVisible) {
    requestHideComposerWindow();
    return;
  }

  showComposerWindow();
};

export const submitComposerToMainWindow = (prompt: string, attachments: unknown[] = []) => {
  hideComposerWindow({ discard: false, keepAppActive: true });
  sendToMainWindow('app:submit-composer', prompt, attachments);
};
