import { join } from 'node:path';
import { appIconPath, appName, isMac } from '@main/application';
import { environment } from '@main/environment';
import { app, BrowserWindow, type BrowserWindowConstructorOptions, screen, shell } from 'electron';

const getRendererUrl = () => (app.isPackaged ? null : (environment.rendererUrl ?? null));

let mainWindow: BrowserWindow | null = null;
let composerWindow: BrowserWindow | null = null;
let composerVisible = false;
let composerOpenedFromStart = false;
let composerBlurSuppressionDepth = 0;

const openExternalUrl = (url: string) => {
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:')) {
    void shell.openExternal(url);
  }
};

const loadRenderer = (window: BrowserWindow, surface: 'composer' | 'main') => {
  const rendererUrl = getRendererUrl();

  if (rendererUrl) {
    const url = new URL(rendererUrl);
    url.searchParams.set('surface', surface);
    void window.loadURL(url.toString());
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'), { query: { surface } });
  }
};

const activeDisplayWorkArea = () => screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea;

export const createMainWindow = (): BrowserWindow => {
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
      devTools: !app.isPackaged,
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
  });

  loadRenderer(window, 'main');

  return window;
};

export const createComposerWindow = (): BrowserWindow => {
  if (composerWindow && !composerWindow.isDestroyed()) return composerWindow;

  const window = new BrowserWindow({
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
    hasShadow: false,
    skipTaskbar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      spellcheck: false,
      devTools: !app.isPackaged,
      backgroundThrottling: true
    }
  });

  composerWindow = window;
  window.setBackgroundColor('#00000000');
  if (isMac) {
    window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  }

  window.once('ready-to-show', () => {
    if (!composerVisible) window.setIgnoreMouseEvents(true);
  });

  window.on('blur', () => {
    if (composerBlurSuppressionDepth === 0) hideComposerWindow();
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

  const shouldHideApp = isMac && !keepAppActive && !composerOpenedFromStart;
  composerVisible = false;
  composerOpenedFromStart = false;
  if (discard) composerWindow.webContents.send('app:discard-composer');
  composerWindow.setOpacity(0);
  composerWindow.setIgnoreMouseEvents(true);
  composerWindow.hide();
  if (shouldHideApp) app.hide();
};

export const showComposerWindow = () => {
  composerOpenedFromStart = BrowserWindow.getFocusedWindow() === mainWindow;
  const window = createComposerWindow();
  composerVisible = true;
  window.setOpacity(0);
  window.setBounds(activeDisplayWorkArea(), false);
  window.setIgnoreMouseEvents(false);
  window.show();
  window.focus();
  window.setOpacity(1);
  window.webContents.send('app:show-composer');
};

export const toggleComposerWindow = () => {
  if (composerVisible) {
    hideComposerWindow();
    return;
  }

  showComposerWindow();
};

export const submitComposerToMainWindow = (prompt: string, attachments: unknown[] = []) => {
  hideComposerWindow({ discard: false, keepAppActive: true });
  sendToMainWindow('app:submit-composer', prompt, attachments);
};

export const rendererProcessLabels = () => {
  const labels = new Map<number, string>();
  if (mainWindow && !mainWindow.isDestroyed()) labels.set(mainWindow.webContents.getOSProcessId(), 'main renderer');
  if (composerWindow && !composerWindow.isDestroyed()) {
    labels.set(composerWindow.webContents.getOSProcessId(), 'composer renderer');
  }
  return labels;
};
