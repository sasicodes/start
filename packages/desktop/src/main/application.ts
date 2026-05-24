import { join } from 'node:path';
import electron from 'electron';

const { app } = electron;

export const appId = 'one.intelligence.start';
export const appName = 'start';
export const isMac = process.platform === 'darwin';
export const appVersion = app.getVersion();
export const appMenuName = 'Start';
export const trayIconPath = join(__dirname, '../../build/icons/tray-icon.png');
export const appIconPath = join(
  __dirname,
  app.isPackaged ? '../../build/icons/icon.png' : '../../build/icons/icon-dev.png'
);
