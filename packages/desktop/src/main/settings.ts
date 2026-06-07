import { loadDesktopId, loadDesktopName } from '@main/device';
import { type MobileRelaySettings, readStartState, updateStartState } from '@main/storage';
import electron from 'electron';
import * as v from 'valibot';

const { globalShortcut } = electron;

export interface AppSettings {
  keepAwake: boolean;
  composerShortcut: string;
  solidWindowBackground: boolean;
  mobileRelay: MobileRelaySettings;
}

export const defaultMobileRelaySettings = {
  enabled: false,
  desktopId: '',
  relayUrl: '',
  desktopName: '',
  relayToken: ''
} satisfies MobileRelaySettings;

export const defaultAppSettings = {
  keepAwake: true,
  solidWindowBackground: false,
  composerShortcut: 'Control+Space',
  mobileRelay: defaultMobileRelaySettings
} satisfies AppSettings;

const booleanSchema = v.fallback(v.boolean(), false);
const trimmedStringSchema = v.fallback(v.pipe(v.string(), v.trim()), '');

const mobileRelaySettingsSchema = v.fallback(
  v.object({
    enabled: booleanSchema,
    relayUrl: trimmedStringSchema,
    desktopId: trimmedStringSchema,
    desktopName: trimmedStringSchema,
    relayToken: trimmedStringSchema
  }),
  defaultMobileRelaySettings
);

const appSettingsSchema = v.fallback(
  v.object({
    keepAwake: v.fallback(v.boolean(), true),
    mobileRelay: mobileRelaySettingsSchema,
    solidWindowBackground: booleanSchema,
    composerShortcut: v.fallback(v.pipe(v.string(), v.trim(), v.minLength(1)), defaultAppSettings.composerShortcut)
  }),
  defaultAppSettings
);

const settingsWithDesktopIdentity = (settings: AppSettings): AppSettings => {
  const desktopId = settings.mobileRelay.desktopId || loadDesktopId();
  const desktopName = settings.mobileRelay.desktopName || loadDesktopName(desktopId);
  if (settings.mobileRelay.desktopId && settings.mobileRelay.desktopName) return settings;

  return {
    ...settings,
    mobileRelay: {
      ...settings.mobileRelay,
      desktopId,
      desktopName
    }
  };
};

export const parseSettings = (value: unknown): AppSettings => v.parse(appSettingsSchema, value);

export const readAppSettings = async (): Promise<AppSettings> => {
  const base = parseSettings(readStartState());
  const settings = settingsWithDesktopIdentity(base);
  if (
    settings.mobileRelay.desktopId !== base.mobileRelay.desktopId ||
    settings.mobileRelay.desktopName !== base.mobileRelay.desktopName
  ) {
    updateStartState({ mobileRelay: settings.mobileRelay });
  }
  return settings;
};

export const writeAppSettings = async (settings: AppSettings): Promise<AppSettings> => {
  const nextSettings = settingsWithDesktopIdentity(parseSettings(settings));
  updateStartState({
    keepAwake: nextSettings.keepAwake,
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
