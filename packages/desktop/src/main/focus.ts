import { isMac } from '@main/application';
import { sendToRendererWindows } from '@main/window';
import { BrowserWindow } from 'electron';

let appFocused = false;
let appFocusTimer: NodeJS.Timeout | null = null;

export const getAppFocusState = () => ({ focused: Boolean(BrowserWindow.getFocusedWindow()) });

const setWindowButtonVisibility = (visible: boolean) => {
  if (!isMac) return;

  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) window.setWindowButtonVisibility(visible);
  }
};

const notifyAppFocusStateChanged = () => {
  const nextFocusState = getAppFocusState();
  setWindowButtonVisibility(nextFocusState.focused);
  if (appFocused === nextFocusState.focused) return;

  appFocused = nextFocusState.focused;
  sendToRendererWindows('app:focus-state-changed', nextFocusState);
};

export const scheduleAppFocusStateChanged = () => {
  if (appFocusTimer) clearTimeout(appFocusTimer);
  appFocusTimer = setTimeout(() => {
    appFocusTimer = null;
    notifyAppFocusStateChanged();
  }, 0);
};

export const clearAppFocusTimer = () => {
  if (!appFocusTimer) return;
  clearTimeout(appFocusTimer);
  appFocusTimer = null;
};
