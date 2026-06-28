import { trackUpdateInstalled } from '@main/analytics/events';
import { isProd } from '@main/application';
import { getAppFocusState, onAppFocusChanged } from '@main/focus';
import { sendToRendererWindows } from '@main/window';
import electron from 'electron';

const { app, ipcMain } = electron;

import electronUpdater from 'electron-updater';

const { autoUpdater } = electronUpdater;

const updateCheckDelayMs = 10 * 1000;
const updateCheckIntervalMs = 60 * 60 * 1000;

export type UpdateState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'available' }
  | { status: 'downloaded' }
  | { status: 'downloading'; percent: number };

let checking = false;
let downloadPending = false;
let state: UpdateState = { status: 'idle' };
let updateCheckTimer: NodeJS.Timeout | undefined;
let lastUpdateCheckStartedAt = 0;
let stopFocusEvents: (() => void) | undefined;
let stopUpdateEvents: (() => void) | undefined;

const notifyUpdateStateChanged = () => {
  sendToRendererWindows('app:update-state-changed', state);
};

const setUpdateState = (nextState: UpdateState) => {
  state = nextState;
  notifyUpdateStateChanged();
};

const stopUpdateCheckSchedule = () => {
  if (!updateCheckTimer) return;

  clearTimeout(updateCheckTimer);
  updateCheckTimer = undefined;
};

const updateInProgress = () =>
  state.status === 'available' || state.status === 'downloaded' || state.status === 'downloading';

const canRequestUpdateCheck = () => isProd && !downloadPending && !updateInProgress();

const canCheckForUpdates = () => canRequestUpdateCheck() && getAppFocusState().focused;

const canStartUpdateCheck = (requireFocus = true) =>
  (requireFocus ? canCheckForUpdates() : canRequestUpdateCheck()) && !checking;

const nextUpdateCheckDelay = () => {
  if (!lastUpdateCheckStartedAt) return updateCheckDelayMs;

  const nextCheckAt = lastUpdateCheckStartedAt + updateCheckIntervalMs;
  return Math.max(updateCheckDelayMs, nextCheckAt - Date.now());
};

const scheduleNextUpdateCheck = () => {
  stopUpdateCheckSchedule();
  if (!canCheckForUpdates()) return;

  updateCheckTimer = setTimeout(() => {
    updateCheckTimer = undefined;
    checkForUpdatesInBackground();
  }, nextUpdateCheckDelay());
  updateCheckTimer.unref();
};

const checkForUpdates = async (requireFocus = true) => {
  if (!canStartUpdateCheck(requireFocus)) return;

  checking = true;
  lastUpdateCheckStartedAt = Date.now();
  try {
    setUpdateState({ status: 'checking' });
    await autoUpdater.checkForUpdates();
  } catch {
    setUpdateState({ status: 'idle' });
  } finally {
    checking = false;
    scheduleNextUpdateCheck();
  }
};

const checkForUpdatesInBackground = () => {
  checkForUpdates().catch(() => {});
};

export const checkForUpdatesNow = () => checkForUpdates(false);

const updateCheckScheduleForFocus = (focused: boolean) => {
  if (focused) {
    scheduleNextUpdateCheck();
    return;
  }

  stopUpdateCheckSchedule();
};

const downloadUpdate = () => {
  if (state.status !== 'available') return { ok: false };

  downloadPending = true;
  setUpdateState({ status: 'downloading', percent: 0 });
  autoUpdater.downloadUpdate().catch(() => {});
  return { ok: true };
};

export const registerUpdateIpc = () => {
  ipcMain.handle('app:update-state', () => state);
  ipcMain.handle('app:download-update', downloadUpdate);
  ipcMain.handle('app:install-update', () => {
    if (state.status !== 'downloaded') return { ok: false };

    trackUpdateInstalled();
    autoUpdater.quitAndInstall(false, true);
    return { ok: true };
  });
};

export const startAutoUpdateChecks = () => {
  if (!isProd || stopUpdateEvents) return;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = app.getVersion().includes('-');

  const onCheckingForUpdate = () => setUpdateState({ status: 'checking' });
  const onUpdateAvailable = () => {
    downloadPending = false;
    setUpdateState({ status: 'available' });
    stopUpdateCheckSchedule();
  };
  const onDownloadProgress = (progress: electronUpdater.ProgressInfo) => {
    if (state.status !== 'downloading') return;
    setUpdateState({ status: 'downloading', percent: Math.round(progress.percent) });
  };
  const onUpdateDownloaded = () => {
    downloadPending = false;
    setUpdateState({ status: 'downloaded' });
    stopUpdateCheckSchedule();
  };
  const onUpdateNotAvailable = () => {
    downloadPending = false;
    setUpdateState({ status: 'idle' });
  };
  const onError = () => {
    downloadPending = false;
    if (state.status === 'downloading') {
      setUpdateState({ status: 'available' });
      return;
    }

    setUpdateState({ status: 'idle' });
    scheduleNextUpdateCheck();
  };

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
