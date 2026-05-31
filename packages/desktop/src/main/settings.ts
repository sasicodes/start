import { readStartState, updateStartState } from '@main/storage';
import electron from 'electron';

const { globalShortcut } = electron;

export type AppSettings = {
  composerShortcut: string;
  solidWindowBackground: boolean;
};

export const defaultAppSettings = {
  composerShortcut: 'Control+Space',
  solidWindowBackground: false
} satisfies AppSettings;

const parseSettings = (value: unknown): AppSettings => {
  if (!value || typeof value !== 'object') return defaultAppSettings;
  const settings = value as Partial<AppSettings>;
  return {
    composerShortcut:
      typeof settings.composerShortcut === 'string' && settings.composerShortcut.trim()
        ? settings.composerShortcut
        : defaultAppSettings.composerShortcut,
    solidWindowBackground: settings.solidWindowBackground === true
  };
};

export const readAppSettings = async (): Promise<AppSettings> => parseSettings(readStartState());

export const writeAppSettings = async (settings: AppSettings): Promise<AppSettings> => {
  const nextSettings = parseSettings(settings);
  updateStartState({
    composerShortcut: nextSettings.composerShortcut,
    solidWindowBackground: nextSettings.solidWindowBackground
  });
  return nextSettings;
};

export const validateAccelerator = (accelerator: string) => {
  try {
    globalShortcut.register(accelerator, () => {});
    const registered = globalShortcut.isRegistered(accelerator);
    if (registered) globalShortcut.unregister(accelerator);
    return registered;
  } catch {
    return false;
  }
};
