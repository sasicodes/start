import { isDev } from '@main/application';
import type { Input } from 'electron';
import electron from 'electron';

const { app } = electron;

const isBlockedDevToolsInput = (input: Input) => {
  const key = input.key.toLowerCase();
  if (key === 'f12') return true;
  if (key === 'r' && (input.control || input.meta)) return true;
  if (key === 'i' && input.shift && (input.control || input.meta || input.alt)) return true;
  return false;
};

export const installWindowHardening = () => {
  if (isDev) return;
  app.on('browser-window-created', (_event, window) => {
    window.webContents.on('context-menu', event => event.preventDefault());
    window.webContents.on('before-input-event', (event, input) => {
      if (input.type !== 'keyDown') return;
      if (isBlockedDevToolsInput(input)) event.preventDefault();
    });
  });
};
