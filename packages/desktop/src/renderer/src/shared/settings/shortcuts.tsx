import { shortcutKeys } from '@renderer/shared/shortcuts/format';
import { composerShortcut } from '@renderer/shared/settings/state';
import { memo } from 'preact/compat';

interface ShortcutEntry {
  label: string;
  chords: string[];
}

export const Shortcuts = memo(() => {
  const entries: ShortcutEntry[] = [
    { label: 'New session', chords: ['Command+N', 'Command+T'] },
    { label: 'Quick access', chords: composerShortcut.value ? [composerShortcut.value] : [] },
    { label: 'Settings', chords: ['Command+,'] },
    { label: 'Keyboard shortcuts', chords: ['Command+/'] },
    { label: 'Toggle workspace folders', chords: ['W'] },
    { label: 'Toggle recent sessions', chords: ['R'] },
    { label: 'Toggle effort level', chords: ['E'] },
    { label: 'Toggle side panel', chords: [']'] },
    { label: 'Submit prompt', chords: ['Enter'] },
    { label: 'New line in prompt', chords: ['Shift+Enter'] },
    { label: 'Use previous message', chords: ['ArrowUp'] },
    { label: 'Use next message', chords: ['ArrowDown'] },
    { label: 'Close side panel or popover', chords: ['Escape'] }
  ];

  return (
    <ul class="m-0 grid list-none gap-1 p-0">
      {entries.map((entry) => (
        <li key={entry.label} class="flex items-center justify-between gap-4 py-1.5">
          <span class="text-sm text-ink">{entry.label}</span>
          <span class="flex items-center gap-1.5">
            {entry.chords.map((chord, index) => (
              <span key={chord} class="flex items-center gap-1.5">
                {index > 0 && <span class="text-xs text-soft">or</span>}
                <span class="flex items-center gap-1">
                  {shortcutKeys(chord).map((key, keyIndex) => (
                    <kbd
                      key={`${chord}-${keyIndex}`}
                      class="grid h-6 min-w-6 place-items-center rounded-md border border-line bg-control px-1.5 font-sans text-xs font-medium text-soft"
                    >
                      {key}
                    </kbd>
                  ))}
                </span>
              </span>
            ))}
          </span>
        </li>
      ))}
    </ul>
  );
});
