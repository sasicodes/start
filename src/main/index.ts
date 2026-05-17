import {
  appIconPath,
  appId,
  appMenuName,
  appProductionIconPath,
  appVersion,
  isMac,
  trayIconPath
} from '@main/application';
import { ChatService } from '@main/chat';
import { listRootItems, type RootItemsScope } from '@main/root-items';
import { type AppSettings, readAppSettings, validateAccelerator, writeAppSettings } from '@main/settings';
import {
  createMainWindow,
  hideComposerWindow,
  sendToMainWindow,
  showComposerWindow,
  submitComposerToMainWindow
} from '@main/window';
import {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  Menu,
  nativeImage,
  nativeTheme,
  shell,
  Tray,
  type WebContents
} from 'electron';

app.setName(appMenuName);

const chat = new ChatService();

let appSettings: AppSettings | null = null;
let tray: Tray | null = null;

const showSettings = () => {
  sendToMainWindow('app:show-settings');
};

const startNewSession = async () => {
  await chat.newSession();
  sendToMainWindow('chat:new-session');
};

const registerComposerShortcut = (accelerator: string) => {
  globalShortcut.unregisterAll();
  return globalShortcut.register(accelerator, showComposerWindow);
};

const createTrayIcon = () => {
  const icon = nativeImage.createFromPath(trayIconPath);
  const trayIcon = icon.isEmpty() ? nativeImage.createFromPath(appIconPath) : icon;
  const resizedIcon = trayIcon.resize({ width: 18, height: 18 });
  resizedIcon.setTemplateImage(isMac);
  return resizedIcon;
};

const installStatusItem = () => {
  if (!tray) {
    tray = new Tray(createTrayIcon());
  }

  tray.setToolTip(appMenuName);
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: 'New Chat',
        accelerator: 'CommandOrControl+N',
        click: () => void startNewSession()
      },
      {
        label: 'Settings',
        accelerator: 'CommandOrControl+,',
        click: showSettings
      },
      { type: 'separator' },
      { label: `Quit ${appMenuName}`, role: 'quit' }
    ])
  );
};

const installApplicationMenu = () => {
  if (!isMac) {
    Menu.setApplicationMenu(null);
    return;
  }

  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: appMenuName,
        submenu: [
          { label: `About ${appMenuName}`, role: 'about' },
          {
            label: 'Check for Updates',
            enabled: false
          },
          { type: 'separator' },
          {
            label: 'Settings',
            click: showSettings,
            accelerator: 'CommandOrControl+,'
          },
          { type: 'separator' },
          { role: 'services' },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideOthers' },
          { role: 'unhide' },
          { type: 'separator' },
          { label: `Quit ${appMenuName}`, role: 'quit' }
        ]
      },
      {
        label: 'File',
        submenu: [
          {
            label: 'New Chat',
            accelerator: 'CommandOrControl+N',
            click: () => void startNewSession()
          },
          { type: 'separator' },
          { role: 'close' }
        ]
      },
      { role: 'editMenu' },
      { role: 'viewMenu' },
      { role: 'windowMenu' },
      {
        role: 'help',
        submenu: [
          {
            label: `${appMenuName} Help`,
            accelerator: 'CommandOrControl+?',
            click: () => void shell.openExternal('https://start.intelligence.one')
          }
        ]
      }
    ])
  );
};

app.whenReady().then(async () => {
  nativeTheme.themeSource = 'system';
  app.setAppUserModelId(appId);
  app.setName(appMenuName);

  if (isMac) {
    const appIcon = nativeImage.createFromPath(appIconPath);
    if (!appIcon.isEmpty()) app.dock?.setIcon(appIcon);
    app.setAboutPanelOptions({
      applicationName: appMenuName,
      applicationVersion: appVersion,
      iconPath: appProductionIconPath,
      version: appVersion
    });
  }

  appSettings = await readAppSettings();
  registerComposerShortcut(appSettings.composerShortcut);

  installApplicationMenu();
  installStatusItem();

  ipcMain.handle('app:list-root-items', async (_event, relativePath: string, scope: RootItemsScope = 'workspace') =>
    listRootItems(relativePath, scope)
  );
  ipcMain.handle('app:settings', () => appSettings);
  ipcMain.handle('app:hide-composer', () => {
    hideComposerWindow();
  });
  ipcMain.handle('app:open-settings', () => {
    hideComposerWindow();
    showSettings();
  });
  ipcMain.handle('app:submit-composer', (_event, prompt: string) => {
    submitComposerToMainWindow(prompt);
  });
  ipcMain.handle('app:set-composer-shortcut', async (_event, composerShortcut: string) => {
    const previousSettings = appSettings;
    if (previousSettings?.composerShortcut === composerShortcut) return { ok: true, settings: previousSettings };

    globalShortcut.unregisterAll();
    if (!validateAccelerator(composerShortcut)) {
      if (previousSettings) registerComposerShortcut(previousSettings.composerShortcut);
      return { ok: false, settings: previousSettings, error: 'That shortcut is already in use or is not available.' };
    }

    const nextSettings = await writeAppSettings({ ...(appSettings ?? {}), composerShortcut });
    const registered = registerComposerShortcut(nextSettings.composerShortcut);
    appSettings = registered ? nextSettings : previousSettings;
    installApplicationMenu();
    installStatusItem();
    return registered
      ? { ok: true, settings: nextSettings }
      : { ok: false, settings: previousSettings, error: 'That shortcut could not be registered.' };
  });
  ipcMain.handle('chat:status', () => chat.getStatus());
  ipcMain.handle('chat:models', () => chat.getModels());
  ipcMain.handle('chat:recent-sessions', () => chat.getRecentSessions());
  ipcMain.handle('chat:open-session', (_event, path: string) => chat.openSession(path));
  ipcMain.handle('chat:auth-providers', () => chat.getAuthProviders());
  ipcMain.handle('chat:set-runtime-api-key', (_event, provider: string, apiKey: string) =>
    chat.setRuntimeApiKey(provider, apiKey)
  );
  ipcMain.handle('chat:login-subscription', (event, provider: string) =>
    chat.loginSubscription(provider, event.sender as WebContents)
  );
  ipcMain.handle('chat:cancel-subscription-login', () => chat.cancelSubscriptionLogin());
  ipcMain.handle('chat:submit-subscription-auth-input', (_event, value: string) =>
    chat.submitSubscriptionAuthInput(value)
  );
  ipcMain.handle('chat:select-model', (_event, modelKey: string) => chat.selectModel(modelKey));
  ipcMain.handle('chat:select-thinking-level', (_event, level: string) => chat.selectThinkingLevel(level));
  ipcMain.handle('chat:send', (event, prompt: string) => chat.send(prompt, event.sender as WebContents));
  ipcMain.handle('chat:command', (event, command: string, excludeFromContext: boolean) =>
    chat.command(command, excludeFromContext, event.sender as WebContents)
  );
  ipcMain.handle('chat:abort', () => chat.abort());
  ipcMain.handle('chat:new-session', () => startNewSession());

  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('before-quit', () => {
  globalShortcut.unregisterAll();
  chat.dispose();
});

app.on('window-all-closed', () => {
  if (!isMac) app.quit();
});
