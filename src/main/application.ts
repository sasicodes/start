import { createRequire } from 'node:module';
import { join } from 'node:path';
import { app } from 'electron';

const require = createRequire(import.meta.url);
const packageJson = require('../../package.json') as { version: string };

export const appId = 'one.intelligence.start';
export const appName = 'start';
export const isMac = process.platform === 'darwin';
export const appVersion = packageJson.version;
export const appMenuName = 'Start';
export const appProductionIconPath = join(__dirname, '../../build/icons/icon.png');
export const trayIconPath = join(__dirname, '../../build/icons/tray-icon.png');
export const appIconPath = join(
  __dirname,
  app.isPackaged ? '../../build/icons/icon.png' : '../../build/icons/icon-dev.png'
);
