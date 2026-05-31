import { initAnalytics, shutdownAnalytics } from '@main/analytics/index';
import {
  trackAppOpened,
  trackComposerSubmitted,
  trackQuickAccessToggled,
  trackSessionCreated,
  trackShortcutChanged
} from '@main/analytics/events';
import { appIconPath, appId, appMenuName, appVersion, isDev, isMac } from '@main/application';
import {
  captureBrowserScreenshot,
  destroyBrowser,
  getBrowserStatus,
  goBackInBrowser,
  goForwardInBrowser,
  openBrowserUrl,
  reloadBrowser,
  setBrowserBounds,
  startBrowserInspect,
  stopBrowser,
  stopBrowserInspect
} from '@main/browser/index';
import { ChatService } from '@main/chat';
import {
  parseCliAdditionalData,
  parseCliLaunchArgv,
  resolveCliWorkspacePath,
  type CliLaunchRequest
} from '@main/cli/args';
import { getCliInstallStatus, installCliCommand } from '@main/cli/install';
import { getAppFocusState, onAppFocusChanged, clearAppFocusTimer, scheduleAppFocusStateChanged } from '@main/focus';
import { getGitChangeSummary, getGitFileBlob, getGitPatch, type GitFileRef } from '@main/git';
import { installWindowHardening } from '@main/harden';
import { registerChatIpc } from '@main/ipc';
import { installApplicationMenu, installStatusItem } from '@main/menu';
import { listRootItems, type RootItemsScope } from '@main/root/items';
import {
  type AppSettings,
  defaultAppSettings,
  readAppSettings,
  validateAccelerator,
  writeAppSettings
} from '@main/settings';
import { checkForUpdatesNow, registerUpdateIpc, startAutoUpdateChecks, stopAutoUpdateChecks } from '@main/updates';
import {
  createMainWindow,
  hideComposerWindow,
  sendToMainWindow,
  sendToRendererWindows,
  showMainWindow,
  submitComposerToMainWindow,
  toggleComposerWindow,
  withComposerBlurSuppressed
} from '@main/window';
import { activateWorkspaceAccess, deactivateWorkspaceAccess } from '@main/workspace/access';
import { getCachedWorkspace, getWorkspace, onWorkspaceChanged } from '@main/workspace/index';
import nodePath from 'node:path';
import electron from 'electron';

const { app, dialog, globalShortcut, ipcMain, nativeImage, nativeTheme, shell } = electron;

app.setName(appMenuName);
if (isDev && isMac) app.commandLine.appendSwitch('use-mock-keychain');
installWindowHardening();

const chat = new ChatService();
const initialCliRequest = parseCliLaunchArgv(process.argv);

let quitAfterAnalyticsShutdown = false;
let appSettings: AppSettings | null = null;
let stopWorkspaceChanged: (() => void) | undefined;
let stopResourceRefresh: (() => void) | null = null;

const notifyRecentSessionsChanged = (workspacePath = chat.getWorkspaceCwd()) => {
  sendToRendererWindows('chat:recent-sessions-changed', { workspacePath });
};

const notifyStatusChanged = () => {
  sendToRendererWindows('chat:status-changed');
};

const notifyWorkspaceChanged = (workspacePath?: string) => {
  notifyStatusChanged();
  notifyRecentSessionsChanged(workspacePath);
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

const showShortcuts = () => {
  sendToMainWindow('app:show-shortcuts');
};

const toggleQuickAccess = (source: 'menu' | 'shortcut') => {
  trackQuickAccessToggled(source, chat.getWorkspaceCwd());
  toggleComposerWindow();
};

const startNewSession = async (source: 'menu' | 'renderer' = 'renderer') => {
  try {
    await chat.newSession();
  } catch {
    return;
  }

  trackSessionCreated(source, chat.getWorkspaceCwd());
  notifyRecentSessionsChanged();
  sendToMainWindow('chat:new-session');
};

const registerComposerShortcut = (accelerator: string) => {
  globalShortcut.unregisterAll();
  return globalShortcut.register(accelerator, () => toggleQuickAccess('shortcut'));
};

const menuActions = () => ({
  onShowSettings: showSettings,
  onShowShortcuts: showShortcuts,
  onQuickAccess: () => toggleQuickAccess('menu'),
  onNewSession: () => void startNewSession('menu'),
  onCheckForUpdates: () => void checkForUpdatesNow(),
  composerShortcut: appSettings?.composerShortcut ?? defaultAppSettings.composerShortcut
});

const showCliError = (message: string) => {
  dialog.showErrorBox('Start command failed', message);
};

const openCliWorkspace = async (request: CliLaunchRequest) => {
  const resolved = await resolveCliWorkspacePath(request.workspacePath);
  if (!resolved.ok) {
    showCliError(resolved.error);
    showMainWindow();
    return;
  }

  const result = await chat.switchWorkspace(resolved.workspacePath);
  if (!result.ok) {
    showCliError(result.error ?? 'Workspace could not be opened.');
    showMainWindow();
    return;
  }

  await getWorkspace(resolved.workspacePath).catch(() => null);
  notifyWorkspaceChanged(result.status?.workspacePath ?? resolved.workspacePath);
  sendToMainWindow('chat:workspace-opened');
  showMainWindow();
};

const handleCliRequest = (request: CliLaunchRequest) => {
  openCliWorkspace(request).catch((error) => {
    showCliError(error instanceof Error ? error.message : 'Workspace could not be opened.');
    showMainWindow();
  });
};

const singleInstanceLock = app.requestSingleInstanceLock(initialCliRequest ? { start: initialCliRequest } : {});

if (!singleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv, _workingDirectory, additionalData) => {
    const request = parseCliAdditionalData(additionalData) ?? parseCliLaunchArgv(argv);
    if (request) {
      handleCliRequest(request);
      return;
    }

    showMainWindow();
  });

  app.whenReady().then(async () => {
    initAnalytics();

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
    trackAppOpened(appSettings.composerShortcut, chat.getWorkspaceCwd());
    registerComposerShortcut(appSettings.composerShortcut);
    activateWorkspaceAccess(chat.getWorkspaceCwd());

    installApplicationMenu(menuActions());
    installStatusItem(menuActions());
    stopWorkspaceChanged = onWorkspaceChanged((workspace) => {
      sendToRendererWindows('app:workspace-changed', workspace);
    });
    stopResourceRefresh = onAppFocusChanged((focused) => {
      if (!focused) return;

      chat
        .refreshActiveSessionResources()
        .then((refreshed) => {
          if (refreshed) sendToRendererWindows('chat:resources-refreshed');
        })
        .catch(() => {});
    });

    ipcMain.handle('app:focus-state', getAppFocusState);
    ipcMain.handle('app:list-root-items', async (_event, relativePath: string, scope: RootItemsScope = 'workspace') =>
      listRootItems(relativePath, scope, chat.getWorkspaceCwd())
    );
    ipcMain.handle('app:git-changes', (_event, workspacePath?: string) =>
      getGitChangeSummary(workspacePath ?? chat.getWorkspaceCwd())
    );
    ipcMain.handle('app:git-patch', (_event, workspacePath?: string) =>
      getGitPatch(workspacePath ?? chat.getWorkspaceCwd())
    );
    ipcMain.handle('app:git-file-blob', (_event, workspacePath: string, filePath: string, ref: GitFileRef) =>
      getGitFileBlob(workspacePath ?? chat.getWorkspaceCwd(), filePath, ref)
    );
    ipcMain.handle('app:workspace', (_event, workspacePath?: string) =>
      getWorkspace(workspacePath ?? chat.getWorkspaceCwd())
    );
    ipcMain.handle('app:settings', () => appSettings);
    ipcMain.handle('app:cli-install-status', getCliInstallStatus);
    ipcMain.handle('app:install-cli', installCliCommand);
    ipcMain.handle('app:browser-back', goBackInBrowser);
    ipcMain.handle('app:browser-forward', goForwardInBrowser);
    ipcMain.handle('app:browser-reload', reloadBrowser);
    ipcMain.handle('app:browser-stop', stopBrowser);
    ipcMain.handle('app:browser-status', getBrowserStatus);
    ipcMain.handle('app:browser-screenshot', captureBrowserScreenshot);
    ipcMain.handle('app:browser-inspect-start', startBrowserInspect);
    ipcMain.handle('app:browser-inspect-stop', stopBrowserInspect);
    ipcMain.handle('app:browser-open', (event, url: string) => openBrowserUrl(event.sender, url));
    ipcMain.handle('app:browser-bounds', (event, bounds) => setBrowserBounds(event.sender, bounds));
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
    ipcMain.handle('app:open-shortcuts', () => {
      hideComposerWindow({ keepAppActive: true });
      showShortcuts();
    });
    ipcMain.handle('app:open-path', (_event, path: string) => shell.openPath(path));
    ipcMain.handle('app:reveal-path', (_event, workspacePath: string, filePath: string) => {
      const cwdResolved = nodePath.resolve(workspacePath);
      const absolutePath = nodePath.resolve(cwdResolved, filePath);
      if (!absolutePath.startsWith(cwdResolved + nodePath.sep) && absolutePath !== cwdResolved) return;
      shell.showItemInFolder(absolutePath);
    });
    ipcMain.handle('app:submit-composer', (_event, prompt: string, attachments = []) => {
      trackComposerSubmitted(prompt, attachments, chat.getWorkspaceCwd());
      submitComposerToMainWindow(prompt, attachments);
    });
    ipcMain.handle('app:set-composer-shortcut', async (_event, composerShortcut: string) => {
      const previousSettings = appSettings;
      if (previousSettings?.composerShortcut === composerShortcut) {
        trackShortcutChanged({ ok: true, changed: false, composerShortcut });
        return { ok: true, settings: previousSettings };
      }

      globalShortcut.unregisterAll();
      if (!validateAccelerator(composerShortcut)) {
        if (previousSettings) registerComposerShortcut(previousSettings.composerShortcut);
        trackShortcutChanged({ ok: false, changed: false, composerShortcut });
        return { ok: false, settings: previousSettings, error: 'That shortcut is already in use or is not available.' };
      }

      const nextSettings = await writeAppSettings({ ...(appSettings ?? {}), composerShortcut });
      const registered = registerComposerShortcut(nextSettings.composerShortcut);
      appSettings = registered ? nextSettings : previousSettings;
      installApplicationMenu(menuActions());
      installStatusItem(menuActions());
      trackShortcutChanged({
        ok: registered,
        changed: registered,
        composerShortcut: nextSettings.composerShortcut,
        ...(previousSettings?.composerShortcut ? { previousComposerShortcut: previousSettings.composerShortcut } : {})
      });
      return registered
        ? { ok: true, settings: nextSettings }
        : { ok: false, settings: previousSettings, error: 'That shortcut could not be registered.' };
    });
    registerChatIpc({
      chat,
      startNewSession,
      notifyStatusChanged,
      withCachedWorkspace,
      withComposerBlurSuppressed,
      notifyRecentSessionsChanged
    });

    app.on('browser-window-blur', scheduleAppFocusStateChanged);
    app.on('browser-window-focus', scheduleAppFocusStateChanged);

    createMainWindow();
    startAutoUpdateChecks();
    if (initialCliRequest) await openCliWorkspace(initialCliRequest);

    app.on('activate', showMainWindow);
  });
}

app.on('before-quit', (event) => {
  if (!quitAfterAnalyticsShutdown) {
    quitAfterAnalyticsShutdown = true;
    event.preventDefault();
    void shutdownAnalytics()
      .catch(() => {})
      .finally(() => app.quit());
    return;
  }

  void shutdownAnalytics();
  globalShortcut.unregisterAll();
  clearAppFocusTimer();
  stopWorkspaceChanged?.();
  stopWorkspaceChanged = undefined;
  stopResourceRefresh?.();
  stopResourceRefresh = null;
  stopAutoUpdateChecks();
  void destroyBrowser();
  chat.dispose();
  deactivateWorkspaceAccess();
});

app.on('window-all-closed', () => {
  if (!isMac) app.quit();
});
