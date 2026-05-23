import { join } from 'node:path';
import { migrateLegacySettings, updateStartState } from '@main/storage';
import { app, globalShortcut } from 'electron';

export type AppSettings = {
  composerShortcut: string;
};

export const defaultAppSettings = {
  composerShortcut: 'Control+Space'
} satisfies AppSettings;

const settingsPath = () => join(app.getPath('userData'), 'settings.json');

const parseSettings = (value: unknown): AppSettings => {
  if (!value || typeof value !== 'object') return defaultAppSettings;
  const settings = value as Partial<AppSettings>;
  return {
    composerShortcut:
      typeof settings.composerShortcut === 'string' && settings.composerShortcut.trim()
        ? settings.composerShortcut
        : defaultAppSettings.composerShortcut
  };
};

export const readAppSettings = async (): Promise<AppSettings> => {
  return parseSettings(migrateLegacySettings(settingsPath()));
};

export const writeAppSettings = async (settings: AppSettings): Promise<AppSettings> => {
  const nextSettings = parseSettings(settings);
  updateStartState({ composerShortcut: nextSettings.composerShortcut });
  return nextSettings;
};

export const validateAccelerator = (accelerator: string) => {
  globalShortcut.register(accelerator, () => undefined);
  const registered = globalShortcut.isRegistered(accelerator);
  if (registered) globalShortcut.unregister(accelerator);
  return registered;
};
