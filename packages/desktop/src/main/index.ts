import { appIconPath, appId, appMenuName, appVersion, isMac } from '@main/application';
import { ChatService } from '@main/chat';
import { clearAppFocusTimer, getAppFocusState, scheduleAppFocusStateChanged } from '@main/focus';
import { getGitChangeSummary, getGitPatch } from '@main/git';
import { registerChatIpc } from '@main/ipc';
import { installApplicationMenu, installStatusItem } from '@main/menu';
import { listRootItems, type RootItemsScope } from '@main/root-items';
import { WorkspaceSessionWatcher } from '@main/session-watcher';
import { listSkills } from '@main/skills';
import {
  readAppSettings,
  writeAppSettings,
  type AppSettings,
  defaultAppSettings,
  validateAccelerator
} from '@main/settings';
import { registerUpdateIpc, startAutoUpdateChecks, stopAutoUpdateChecks } from '@main/updates';
import {
  createMainWindow,
  hideComposerWindow,
  sendToRendererWindows,
  sendToMainWindow,
  showMainWindow,
  toggleComposerWindow,
  submitComposerToMainWindow,
  withComposerBlurSuppressed
} from '@main/window';
import { getCachedWorkspace, getWorkspace, onWorkspaceChanged } from '@main/workspace/index';
import { activateWorkspaceAccess, deactivateWorkspaceAccess } from '@main/workspace/access';
import { app, globalShortcut, ipcMain, nativeImage, nativeTheme, shell } from 'electron';

app.setName(appMenuName);

const chat = new ChatService();

let appSettings: AppSettings | null = null;
let stopWorkspaceChanged: (() => void) | undefined;
const recentSessionsWatcher = new WorkspaceSessionWatcher();

const notifyRecentSessionsChanged = (workspacePath = chat.getWorkspaceCwd()) => {
  sendToRendererWindows('chat:recent-sessions-changed', { workspacePath });
};

const notifyStatusChanged = () => {
  sendToRendererWindows('chat:status-changed');
};

const watchRecentSessions = (workspacePath = chat.getWorkspaceCwd()) => {
  recentSessionsWatcher.watch(workspacePath, notifyRecentSessionsChanged);
};

const withCachedWorkspace = async <T extends { status?: { workspacePath: string } }>(result: T) => {
  const workspacePath = result.status?.workspacePath;
  if (!workspacePath) return result;

  const workspace = await getCachedWorkspace(workspacePath);
  return workspace ? { ...result, workspace } : result;
};

const showSettings = () => {
  sendToMainWindow('app:show-settings');
};

const startNewSession = async () => {
  try {
    await chat.newSession();
  } catch {
    return;
  }

  watchRecentSessions();
  notifyRecentSessionsChanged();
  sendToMainWindow('chat:new-session');
};

const registerComposerShortcut = (accelerator: string) => {
  globalShortcut.unregisterAll();
  return globalShortcut.register(accelerator, toggleComposerWindow);
};

const menuActions = () => ({
  onShowSettings: showSettings,
  onQuickAccess: toggleComposerWindow,
  onNewSession: () => void startNewSession(),
  composerShortcut: appSettings?.composerShortcut ?? defaultAppSettings.composerShortcut
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
  activateWorkspaceAccess(chat.getWorkspaceCwd());

  installApplicationMenu(menuActions());
  installStatusItem(menuActions());
  watchRecentSessions();
  stopWorkspaceChanged = onWorkspaceChanged((workspace) => {
    sendToRendererWindows('app:workspace-changed', workspace);
  });

  ipcMain.handle('app:focus-state', getAppFocusState);
  ipcMain.handle('app:list-root-items', async (_event, relativePath: string, scope: RootItemsScope = 'workspace') =>
    listRootItems(relativePath, scope, chat.getWorkspaceCwd())
  );
  ipcMain.handle('app:list-skills', () => listSkills(chat.getWorkspaceCwd()));
  ipcMain.handle('app:git-changes', (_event, workspacePath?: string) =>
    getGitChangeSummary(workspacePath ?? chat.getWorkspaceCwd())
  );
  ipcMain.handle('app:git-patch', (_event, workspacePath?: string) =>
    getGitPatch(workspacePath ?? chat.getWorkspaceCwd())
  );
  ipcMain.handle('app:workspace', (_event, workspacePath?: string) =>
    getWorkspace(workspacePath ?? chat.getWorkspaceCwd())
  );
  ipcMain.handle('app:settings', () => appSettings);
  registerUpdateIpc();
  ipcMain.handle('app:hide-composer', () => {
    hideComposerWindow();
  });
  ipcMain.handle('app:show-main', () => {
    hideComposerWindow({ keepAppActive: true });
    showMainWindow();
  });
  ipcMain.handle('app:open-settings', () => {
    hideComposerWindow({ keepAppActive: true });
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
  registerChatIpc({
    chat,
    startNewSession,
    notifyStatusChanged,
    watchRecentSessions,
    withCachedWorkspace,
    withComposerBlurSuppressed,
    notifyRecentSessionsChanged
  });

  app.on('browser-window-blur', scheduleAppFocusStateChanged);
  app.on('browser-window-focus', scheduleAppFocusStateChanged);

  createMainWindow();
  startAutoUpdateChecks();

  app.on('activate', showMainWindow);
});

app.on('before-quit', () => {
  globalShortcut.unregisterAll();
  clearAppFocusTimer();
  recentSessionsWatcher.close();
  stopWorkspaceChanged?.();
  stopWorkspaceChanged = undefined;
  stopAutoUpdateChecks();
  chat.dispose();
  deactivateWorkspaceAccess();
});

app.on('window-all-closed', () => {
  if (!isMac) app.quit();
});
