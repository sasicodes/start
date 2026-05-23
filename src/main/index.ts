import { appIconPath, appId, appMenuName, appVersion, isMac } from '@main/application';
import { ChatService } from '@main/chat';
import { debugToolbarEnabled, getDebugMetrics } from '@main/debug';
import { clearAppFocusTimer, getAppFocusState, scheduleAppFocusStateChanged } from '@main/focus';
import { installApplicationMenu, installStatusItem } from '@main/menu';
import { listRootItems, type RootItemsScope } from '@main/root-items';
import { WorkspaceSessionWatcher } from '@main/session-watcher';
import { type AppSettings, readAppSettings, validateAccelerator, writeAppSettings } from '@main/settings';
import {
  createMainWindow,
  hideComposerWindow,
  sendToRendererWindows,
  sendToMainWindow,
  showComposerWindow,
  submitComposerToMainWindow
} from '@main/window';
import { getWorkspace } from '@main/workspace';
import {
  app,
  BrowserWindow,
  dialog,
  globalShortcut,
  ipcMain,
  nativeImage,
  nativeTheme,
  shell,
  type WebContents
} from 'electron';

app.setName(appMenuName);

const chat = new ChatService();

let appSettings: AppSettings | null = null;
const recentSessionsWatcher = new WorkspaceSessionWatcher();

const notifyRecentSessionsChanged = (workspacePath = chat.getWorkspaceCwd()) => {
  sendToRendererWindows('chat:recent-sessions-changed', { workspacePath });
};

const watchRecentSessions = (workspacePath = chat.getWorkspaceCwd()) => {
  recentSessionsWatcher.watch(workspacePath, notifyRecentSessionsChanged);
};

const showSettings = () => {
  sendToMainWindow('app:show-settings');
};

const startNewSession = async () => {
  await chat.newSession();
  watchRecentSessions();
  notifyRecentSessionsChanged();
  sendToMainWindow('chat:new-session');
};

const registerComposerShortcut = (accelerator: string) => {
  globalShortcut.unregisterAll();
  return globalShortcut.register(accelerator, showComposerWindow);
};

const menuActions = () => ({
  onShowSettings: showSettings,
  onNewSession: () => void startNewSession()
});

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
      iconPath: appIconPath,
      version: appVersion
    });
  }

  appSettings = await readAppSettings();
  registerComposerShortcut(appSettings.composerShortcut);

  installApplicationMenu(menuActions());
  installStatusItem(menuActions());
  watchRecentSessions();

  ipcMain.handle('app:debug-metrics', getDebugMetrics);
  ipcMain.handle('app:focus-state', getAppFocusState);
  ipcMain.handle('app:runtime', () => ({ debugToolbar: debugToolbarEnabled() }));
  ipcMain.handle('app:list-root-items', async (_event, relativePath: string, scope: RootItemsScope = 'workspace') =>
    listRootItems(relativePath, scope, chat.getWorkspaceCwd())
  );
  ipcMain.handle('app:workspace', (_event, workspacePath?: string) =>
    getWorkspace(workspacePath ?? chat.getWorkspaceCwd())
  );
  ipcMain.handle('app:settings', () => appSettings);
  ipcMain.handle('app:hide-composer', () => {
    hideComposerWindow();
  });
  ipcMain.handle('app:open-settings', () => {
    hideComposerWindow();
    showSettings();
  });
  ipcMain.handle('app:open-path', (_event, path: string) => shell.openPath(path));
  ipcMain.handle('app:submit-composer', (_event, prompt: string, attachments = []) => {
    submitComposerToMainWindow(prompt, attachments);
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
    installApplicationMenu(menuActions());
    installStatusItem(menuActions());
    return registered
      ? { ok: true, settings: nextSettings }
      : { ok: false, settings: previousSettings, error: 'That shortcut could not be registered.' };
  });
  ipcMain.handle('chat:status', () => chat.getStatus());
  ipcMain.handle('chat:models', () => chat.getModels());
  ipcMain.handle('chat:recent-sessions', (_event, workspacePath?: string) => chat.getRecentSessions(workspacePath));
  ipcMain.handle('chat:workspace-folders', () => chat.getWorkspaceFolders());
  ipcMain.handle('chat:prepare-clipboard-image', () => chat.prepareClipboardImage());
  ipcMain.handle('chat:prepare-dropped-files', (_event, paths: string[]) => chat.prepareDroppedFiles(paths));
  ipcMain.handle('chat:release-attachments', (_event, ids: string[]) => chat.releaseAttachments(ids));
  ipcMain.handle('chat:switch-workspace', async (_event, path: string) => {
    const result = await chat.switchWorkspace(path);
    if (result.ok) {
      watchRecentSessions(result.status?.workspacePath);
      notifyRecentSessionsChanged(result.status?.workspacePath);
    }
    return result;
  });
  ipcMain.handle('chat:choose-workspace-directory', async () => {
    const result = await dialog.showOpenDialog({
      defaultPath: chat.getWorkspaceCwd(),
      properties: ['openDirectory']
    });
    const path = result.filePaths[0];
    if (result.canceled || !path) return { ok: true, cancelled: true, status: await chat.getStatus() };
    const nextResult = await chat.switchWorkspace(path);
    if (nextResult.ok) {
      watchRecentSessions(nextResult.status?.workspacePath);
      notifyRecentSessionsChanged(nextResult.status?.workspacePath);
    }
    return nextResult;
  });
  ipcMain.handle('chat:open-session', async (_event, path: string) => {
    const result = await chat.openSession(path);
    if (result.ok) {
      watchRecentSessions();
      notifyRecentSessionsChanged();
    }
    return result;
  });
  ipcMain.handle('chat:open-session-id', async (_event, sessionId: string) => {
    const result = await chat.openSessionId(sessionId);
    if (result.ok) {
      watchRecentSessions();
      notifyRecentSessionsChanged();
    }
    return result;
  });
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
  ipcMain.handle('chat:send', async (event, prompt: string, attachments = []) => {
    const result = await chat.send(prompt, event.sender as WebContents, attachments);
    if (result.ok) notifyRecentSessionsChanged();
    return result;
  });
  ipcMain.handle('chat:command', async (event, command: string, excludeFromContext: boolean) => {
    const result = await chat.command(command, excludeFromContext, event.sender as WebContents);
    if (result.ok) notifyRecentSessionsChanged();
    return result;
  });
  ipcMain.handle('chat:abort', () => chat.abort());
  ipcMain.handle('chat:new-session', () => startNewSession());

  app.on('browser-window-blur', scheduleAppFocusStateChanged);
  app.on('browser-window-focus', scheduleAppFocusStateChanged);

  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('before-quit', () => {
  globalShortcut.unregisterAll();
  clearAppFocusTimer();
  recentSessionsWatcher.close();
  chat.dispose();
});

app.on('window-all-closed', () => {
  if (!isMac) app.quit();
});
