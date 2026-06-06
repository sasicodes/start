import type { BrowserWindow as ElectronBrowserWindow, MessageBoxOptions } from 'electron';
import electron from 'electron';

const { dialog } = electron;

let closeConfirmation: Promise<boolean> | null = null;

const confirmationOptions: MessageBoxOptions = {
  cancelId: 0,
  defaultId: 0,
  type: 'question',
  buttons: ['Cancel', 'OK'],
  message: 'Are you sure you want to close this window?'
};

const showCloseConfirmation = async (window: ElectronBrowserWindow | null) => {
  const result =
    window && !window.isDestroyed()
      ? await dialog.showMessageBox(window, confirmationOptions)
      : await dialog.showMessageBox(confirmationOptions);

  return result.response === 1;
};

const runCloseConfirmation = async (window: ElectronBrowserWindow | null) => {
  try {
    return await showCloseConfirmation(window);
  } finally {
    closeConfirmation = null;
  }
};

export const confirmClose = (window: ElectronBrowserWindow | null) => {
  if (!closeConfirmation) closeConfirmation = runCloseConfirmation(window);
  return closeConfirmation;
};
