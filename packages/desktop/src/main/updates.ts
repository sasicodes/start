import { getAppFocusState, onAppFocusChanged } from '@main/focus';
import { sendToRendererWindows } from '@main/window';
import { app, ipcMain } from 'electron';
import { autoUpdater, type UpdateInfo } from 'electron-updater';

const updateCheckDelayMs = 30 * 1000;
const updateCheckIntervalMs = 60 * 60 * 1000;

export type UpdateState =
  | { status: 'available'; version?: string }
  | { status: 'downloaded'; version?: string }
  | { status: 'downloading'; version?: string }
  | { error: string; status: 'error' }
  | { status: 'checking' }
  | { status: 'idle' };

type VersionedUpdateStatus = 'available' | 'downloaded' | 'downloading';

let checking = false;
let initialUpdateCheckTimer: NodeJS.Timeout | undefined;
let state: UpdateState = { status: 'idle' };
let updateCheckTimer: NodeJS.Timeout | undefined;
let stopFocusEvents: (() => void) | undefined;
let stopUpdateEvents: (() => void) | undefined;

const notifyUpdateStateChanged = () => {
  sendToRendererWindows('app:update-state-changed', state);
};

const setUpdateState = (nextState: UpdateState) => {
  state = nextState;
  notifyUpdateStateChanged();
};

const updateState = (status: VersionedUpdateStatus, info: UpdateInfo): UpdateState => {
  const version = info.version || undefined;
  return { status, ...(version ? { version } : {}) };
};

const currentUpdateVersion = () => {
  if (state.status === 'available' || state.status === 'downloaded' || state.status === 'downloading') {
    return state.version;
  }

  return;
};

const checkForUpdates = async () => {
  if (!app.isPackaged || checking || !getAppFocusState().focused) return;

  checking = true;
  try {
    setUpdateState({ status: 'checking' });
    await autoUpdater.checkForUpdates();
  } catch (error) {
    setUpdateState({ status: 'error', error: error instanceof Error ? error.message : 'Update check failed.' });
  } finally {
    checking = false;
  }
};

const stopUpdateCheckSchedule = () => {
  if (initialUpdateCheckTimer) {
    clearTimeout(initialUpdateCheckTimer);
    initialUpdateCheckTimer = undefined;
  }

  if (updateCheckTimer) {
    clearInterval(updateCheckTimer);
    updateCheckTimer = undefined;
  }
};

const startUpdateCheckSchedule = () => {
  if (updateCheckTimer) return;

  initialUpdateCheckTimer = setTimeout(() => {
    void checkForUpdates();
    initialUpdateCheckTimer = undefined;
  }, updateCheckDelayMs);
  initialUpdateCheckTimer.unref();

  updateCheckTimer = setInterval(() => void checkForUpdates(), updateCheckIntervalMs);
  updateCheckTimer.unref();
};

const updateCheckScheduleForFocus = (focused: boolean) => {
  if (focused) {
    startUpdateCheckSchedule();
    return;
  }

  stopUpdateCheckSchedule();
};

export const registerUpdateIpc = () => {
  ipcMain.handle('app:update-state', () => state);
  ipcMain.handle('app:install-update', () => {
    if (state.status !== 'downloaded') return { ok: false };

    autoUpdater.quitAndInstall(false, true);
    return { ok: true };
  });
};

export const startAutoUpdateChecks = () => {
  if (!app.isPackaged || stopUpdateEvents) return;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = app.getVersion().includes('-');

  const onCheckingForUpdate = () => setUpdateState({ status: 'checking' });
  const onUpdateAvailable = (info: UpdateInfo) => setUpdateState(updateState('available', info));
  const onDownloadProgress = () => {
    if (state.status !== 'downloaded' && state.status !== 'downloading') {
      const version = currentUpdateVersion();
      setUpdateState({ status: 'downloading', ...(version ? { version } : {}) });
    }
  };
  const onUpdateDownloaded = (info: UpdateInfo) => setUpdateState(updateState('downloaded', info));
  const onUpdateNotAvailable = () => setUpdateState({ status: 'idle' });
  const onError = (error: Error) => setUpdateState({ status: 'error', error: error.message || 'Update failed.' });

  autoUpdater.on('error', onError);
  autoUpdater.on('download-progress', onDownloadProgress);
  autoUpdater.on('update-available', onUpdateAvailable);
  autoUpdater.on('update-downloaded', onUpdateDownloaded);
  autoUpdater.on('checking-for-update', onCheckingForUpdate);
  autoUpdater.on('update-not-available', onUpdateNotAvailable);

  stopUpdateEvents = () => {
    autoUpdater.off('error', onError);
    autoUpdater.off('download-progress', onDownloadProgress);
    autoUpdater.off('update-available', onUpdateAvailable);
    autoUpdater.off('update-downloaded', onUpdateDownloaded);
    autoUpdater.off('checking-for-update', onCheckingForUpdate);
    autoUpdater.off('update-not-available', onUpdateNotAvailable);
  };

  stopFocusEvents = onAppFocusChanged(updateCheckScheduleForFocus);
  updateCheckScheduleForFocus(getAppFocusState().focused);
};

export const stopAutoUpdateChecks = () => {
  stopUpdateCheckSchedule();

  stopFocusEvents?.();
  stopFocusEvents = undefined;
  stopUpdateEvents?.();
  stopUpdateEvents = undefined;
};
