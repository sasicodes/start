import { signal } from '@preact/signals';
import type { AppSettingsResult } from '@preload/index';

export const keepAwake = signal(true);
export const composerShortcut = signal('Control+Space');

export const updateKeepAwake = async (enabled: boolean): Promise<AppSettingsResult> => {
  try {
    const result = await window.pi.app.setKeepAwake(enabled);
    if (result.settings) keepAwake.value = result.settings.keepAwake;
    return result;
  } catch {
    return { ok: false, settings: null, error: 'Keep awake could not be saved.' };
  }
};

export const updateComposerShortcut = async (shortcut: string): Promise<AppSettingsResult> => {
  try {
    const result = await window.pi.app.setComposerShortcut(shortcut);
    if (result.settings) composerShortcut.value = result.settings.composerShortcut;
    return result;
  } catch {
    return { ok: false, settings: null, error: 'That shortcut could not be saved.' };
  }
};
