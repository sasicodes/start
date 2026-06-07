import { signal } from '@preact/signals';

export const composerShortcut = signal('Control+Space');

export const updateComposerShortcut = async (shortcut: string) => {
  const result = await window.pi.app.setComposerShortcut(shortcut);
  if (result.settings) composerShortcut.value = result.settings.composerShortcut;
  return result;
};
