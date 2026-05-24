import { sendToRendererWindows } from '@main/window';
import electron from 'electron';

const { BrowserWindow } = electron;

type AppFocusListener = (focused: boolean) => void;

let appFocused = false;
let appFocusTimer: NodeJS.Timeout | null = null;
const appFocusListeners = new Set<AppFocusListener>();

export const getAppFocusState = () => ({ focused: Boolean(BrowserWindow.getFocusedWindow()) });

const notifyAppFocusStateChanged = () => {
  const nextFocusState = getAppFocusState();
  if (appFocused === nextFocusState.focused) return;

  appFocused = nextFocusState.focused;
  sendToRendererWindows('app:focus-state-changed', nextFocusState);
  for (const listener of appFocusListeners) listener(nextFocusState.focused);
};

export const onAppFocusChanged = (listener: AppFocusListener) => {
  appFocusListeners.add(listener);
  return () => appFocusListeners.delete(listener);
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
