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
  | { status: 'downloaded' }
  | { error: string; status: 'error' }
  | { status: 'checking' }
  | { status: 'idle' };

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

const updateErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

const updateIsReadyToInstall = () => state.status === 'downloaded';

const canRequestUpdateCheck = () => isProd && !downloadPending && !updateIsReadyToInstall();

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
  } catch (error) {
    setUpdateState({ status: 'error', error: updateErrorMessage(error, 'Update check failed.') });
  } finally {
    checking = false;
    scheduleNextUpdateCheck();
  }
};

const checkForUpdatesInBackground = () => {
  checkForUpdates().catch((error: unknown) => {
    setUpdateState({ status: 'error', error: updateErrorMessage(error, 'Update check failed.') });
    scheduleNextUpdateCheck();
  });
};

export const checkForUpdatesNow = () => checkForUpdates(false);

const updateCheckScheduleForFocus = (focused: boolean) => {
  if (focused) {
    scheduleNextUpdateCheck();
    return;
  }

  stopUpdateCheckSchedule();
};

export const registerUpdateIpc = () => {
  ipcMain.handle('app:update-state', () => state);
  ipcMain.handle('app:install-update', () => {
    if (state.status !== 'downloaded') return { ok: false };

    trackUpdateInstalled();
    autoUpdater.quitAndInstall(false, true);
    return { ok: true };
  });
};

export const startAutoUpdateChecks = () => {
  if (!isProd || stopUpdateEvents) return;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = app.getVersion().includes('-');

  const onCheckingForUpdate = () => setUpdateState({ status: 'checking' });
  const onUpdateAvailable = () => {
    downloadPending = true;
    stopUpdateCheckSchedule();
  };
  const onDownloadProgress = () => {
    downloadPending = true;
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
  const onError = (error: Error) => {
    downloadPending = false;
    setUpdateState({ status: 'error', error: updateErrorMessage(error, 'Update failed.') });
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
