import type { AppSettingsResult } from '@preload/index';
import { useState } from 'preact/hooks';

interface ComposerShortcutProps {
  composerShortcut: string;
  onChange: (shortcut: string) => Promise<AppSettingsResult>;
}

const modifierLabel = (event: KeyboardEvent) => {
  const modifiers = [];
  if (event.ctrlKey) modifiers.push('Control');
  if (event.metaKey) modifiers.push('Command');
  if (event.altKey) modifiers.push('Alt');
  if (event.shiftKey) modifiers.push('Shift');
  return modifiers;
};

const keyLabel = (key: string) => {
  if (key === ' ') return 'Space';
  if (key === 'Escape') return '';
  if (key.length === 1) return key.toUpperCase();
  return key;
};

export const ComposerShortcut = ({ composerShortcut, onChange }: ComposerShortcutProps) => {
  const [error, setError] = useState('');
  const [recording, setRecording] = useState(false);

  const record = async (event: KeyboardEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const key = keyLabel(event.key);
    const modifiers = modifierLabel(event);
    if (!key) {
      setRecording(false);
      return;
    }

    if (modifiers.length === 0) {
      setError('Use at least one modifier key.');
      return;
    }

    const shortcut = [...modifiers, key].join('+');
    try {
      const result = await onChange(shortcut);
      setError(result.error ?? '');
    } catch {
      setError('That shortcut could not be saved.');
    }
    setRecording(false);
  };

  return (
    <div class="mt-4 border-t border-line pt-5">
      <div class="flex min-w-0 items-center justify-between gap-4">
        <div class="min-w-0">
          <h2 class="m-0 text-sm leading-5 font-medium text-ink">Composer shortcut</h2>
          <p class="m-0 mt-0.5 text-xs leading-4 text-soft">Open the composer from anywhere while Start is running.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setError('');
            setRecording(true);
          }}
          onKeyDown={(event) => {
            if (recording) record(event);
          }}
          class="h-9 min-w-36 rounded-full border border-line bg-control px-4 text-sm font-medium text-ink transition-opacity duration-100 ease-in hover:opacity-80"
        >
          {recording ? 'Recording shortcut' : composerShortcut.replaceAll('+', ' + ')}
        </button>
      </div>
      {error && <p class="m-0 mt-3 text-xs leading-4 text-danger">{error}</p>}
    </div>
  );
};
