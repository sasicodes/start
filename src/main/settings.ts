import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
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
  try {
    const content = await readFile(settingsPath(), 'utf8');
    return parseSettings(JSON.parse(content));
  } catch {
    return defaultAppSettings;
  }
};

export const writeAppSettings = async (settings: AppSettings): Promise<AppSettings> => {
  const nextSettings = parseSettings(settings);
  const path = settingsPath();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(nextSettings, null, 2)}\n`, 'utf8');
  return nextSettings;
};

export const validateAccelerator = (accelerator: string) => {
  globalShortcut.register(accelerator, () => undefined);
  const registered = globalShortcut.isRegistered(accelerator);
  if (registered) globalShortcut.unregister(accelerator);
  return registered;
};
