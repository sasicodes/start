import { loadDesktopId } from '@main/device';
import { readStartState, updateStartState, type MobileRelaySettings } from '@main/storage';
import electron from 'electron';

const { globalShortcut } = electron;

export interface AppSettings {
  mobileRelay: MobileRelaySettings;
  composerShortcut: string;
  solidWindowBackground: boolean;
}

export const defaultMobileRelaySettings = {
  enabled: false,
  desktopId: '',
  relayUrl: '',
  relayToken: ''
} satisfies MobileRelaySettings;

export const defaultAppSettings = {
  mobileRelay: defaultMobileRelaySettings,
  composerShortcut: 'Control+Space',
  solidWindowBackground: false
} satisfies AppSettings;

const parseString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const parseMobileRelaySettings = (value: unknown): MobileRelaySettings => {
  if (!value || typeof value !== 'object') return defaultMobileRelaySettings;
  const settings = value as Partial<MobileRelaySettings>;

  return {
    enabled: settings.enabled === true,
    desktopId: parseString(settings.desktopId),
    relayUrl: parseString(settings.relayUrl),
    relayToken: parseString(settings.relayToken)
  };
};

const settingsWithDesktopId = (settings: AppSettings): AppSettings => {
  if (settings.mobileRelay.desktopId) return settings;

  return {
    ...settings,
    mobileRelay: {
      ...settings.mobileRelay,
      desktopId: loadDesktopId()
    }
  };
};

export const parseSettings = (value: unknown): AppSettings => {
  if (!value || typeof value !== 'object') return defaultAppSettings;
  const settings = value as Partial<AppSettings>;
  return {
    mobileRelay: parseMobileRelaySettings(settings.mobileRelay),
    composerShortcut: parseString(settings.composerShortcut) || defaultAppSettings.composerShortcut,
    solidWindowBackground: settings.solidWindowBackground === true
  };
};

export const readAppSettings = async (): Promise<AppSettings> => {
  const settings = settingsWithDesktopId(parseSettings(readStartState()));
  updateStartState({ mobileRelay: settings.mobileRelay });
  return settings;
};

export const writeAppSettings = async (settings: AppSettings): Promise<AppSettings> => {
  const nextSettings = settingsWithDesktopId(parseSettings(settings));
  updateStartState({
    mobileRelay: nextSettings.mobileRelay,
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
