import { composerShortcut, updateComposerShortcut } from '@renderer/shared/settings/state';
import { shortcutKeys } from '@renderer/shared/shortcuts/format';
import { Tooltip } from '@renderer/ui/tooltip';
import { useState } from 'preact/hooks';

const modifierKeys = new Set(['Control', 'Meta', 'Alt', 'Shift']);

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

export const ComposerShortcut = () => {
  const [error, setError] = useState('');
  const [recording, setRecording] = useState(false);

  const record = async (event: KeyboardEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (modifierKeys.has(event.key)) return;

    const key = keyLabel(event.key);
    const modifiers = modifierLabel(event);
    if (!key || modifiers.length === 0) {
      setRecording(false);
      return;
    }

    const shortcut = [...modifiers, key].join('+');
    const result = await updateComposerShortcut(shortcut);
    setError(result.error ?? '');
    setRecording(false);
  };

  return (
    <div class="mt-5">
      <div class="flex min-w-0 items-center justify-between gap-4">
        <div class="min-w-0">
          <h2 class="m-0 text-sm leading-5 font-medium text-ink">Composer shortcut</h2>
          <p class="m-0 mt-0.5 text-xs leading-4 text-soft">Open the composer from anywhere while Start is running.</p>
        </div>
        <Tooltip side="left" label={recording ? 'Press the new shortcut' : 'Change shortcut'}>
          <button
            type="button"
            onClick={() => {
              setError('');
              setRecording(true);
            }}
            onKeyDown={(event) => {
              if (recording) record(event);
            }}
            onBlur={() => setRecording(false)}
            class="grid h-9 min-w-9 place-items-center rounded-full border border-line bg-transparent px-3 text-sm font-medium text-ink transition-opacity duration-100 ease-in hover:opacity-80"
          >
            {recording ? (
              <span class="inline-block size-2 animate-pulse rounded-full bg-danger" />
            ) : (
              shortcutKeys(composerShortcut.value).join(' ')
            )}
          </button>
        </Tooltip>
      </div>
      {error && <p class="m-0 mt-2 text-xs leading-4 text-danger">{error}</p>}
    </div>
  );
};
