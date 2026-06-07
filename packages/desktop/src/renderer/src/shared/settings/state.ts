import { signal } from '@preact/signals';

export const keepAwake = signal(true);
export const composerShortcut = signal('Control+Space');

export const updateKeepAwake = async (enabled: boolean) => {
  const result = await window.pi.app.setKeepAwake(enabled);
  if (result.settings) keepAwake.value = result.settings.keepAwake;
  return result;
};

export const updateComposerShortcut = async (shortcut: string) => {
  const result = await window.pi.app.setComposerShortcut(shortcut);
  if (result.settings) composerShortcut.value = result.settings.composerShortcut;
  return result;
};
