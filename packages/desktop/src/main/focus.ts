import { sendToRendererWindows } from '@main/window';
import { BrowserWindow } from 'electron';

let appFocused = false;
let appFocusTimer: NodeJS.Timeout | null = null;

export const getAppFocusState = () => ({ focused: Boolean(BrowserWindow.getFocusedWindow()) });

const notifyAppFocusStateChanged = () => {
  const nextFocusState = getAppFocusState();
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
