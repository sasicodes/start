import { homedir } from 'node:os';
import { join } from 'node:path';
import electron from 'electron';

const { app } = electron;

export const appId = 'one.intelligence.start';
export const appName = 'start';
export const isMac = process.platform === 'darwin';
export const isProd = app.isPackaged;
export const isDev = !app.isPackaged;
export const appVersion = app.getVersion();
export const appMenuName = 'Start';
export const baseDir = join(homedir(), isProd ? '.start' : '.start-dev');
export const trayIconPath = join(__dirname, '../../build/icons/tray-icon.png');
export const appIconPath = join(__dirname, isProd ? '../../build/icons/icon.png' : '../../build/icons/icon-dev.png');
