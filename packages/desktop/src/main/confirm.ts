import { workInProgress } from '@main/wip';
import type { MessageBoxOptions } from 'electron';
import electron from 'electron';

const { dialog } = electron;

let closeConfirmation: Promise<boolean> | null = null;

const confirmationOptions: MessageBoxOptions = {
  cancelId: 0,
  defaultId: 1,
  type: 'warning',
  message: 'Quit Start?',
  buttons: ['Cancel', 'Quit'],
  detail: 'Active local threads on this machine will be interrupted'
};

const showCloseConfirmation = async () => {
  const result = await dialog.showMessageBox(confirmationOptions);
  return result.response === 1;
};

const runCloseConfirmation = async () => {
  try {
    return await showCloseConfirmation();
  } finally {
    closeConfirmation = null;
  }
};

export const confirmClose = () => {
  if (!workInProgress()) return Promise.resolve(true);

  if (!closeConfirmation) closeConfirmation = runCloseConfirmation();
  return closeConfirmation;
};
