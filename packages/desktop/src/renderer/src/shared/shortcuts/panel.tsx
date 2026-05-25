import { formatShortcut } from '@renderer/shared/shortcuts/format';
import { tw } from '@renderer/utils/tw';
import { memo } from 'preact/compat';

interface ShortcutsProps {
  composerShortcut: string;
}

interface ShortcutEntry {
  label: string;
  chords: string[];
}

export const Shortcuts = memo(({ composerShortcut }: ShortcutsProps) => {
  const entries: ShortcutEntry[] = [
    { label: 'New session', chords: ['Command+N', 'Command+T'] },
    { label: 'Quick access', chords: composerShortcut ? [composerShortcut] : [] },
    { label: 'Settings', chords: ['Command+,'] },
    { label: 'Keyboard shortcuts', chords: ['Command+/'] },
    { label: 'Toggle side panel', chords: [']'] },
    { label: 'Submit prompt', chords: ['Enter'] },
    { label: 'New line in prompt', chords: ['Shift+Enter'] },
    { label: 'Refill previous prompt', chords: ['ArrowUp'] },
    { label: 'Finder next', chords: ['ArrowDown'] },
    { label: 'Finder previous', chords: ['ArrowUp'] },
    { label: 'Close side panel or popover', chords: ['Escape'] }
  ];

  return (
    <section class="px-5 py-4 outline-0">
      <ul class="m-0 grid list-none gap-0 p-0">
        {entries.map((entry, index) => (
          <li
            key={entry.label}
            class={tw('flex items-center justify-between gap-4 py-3', index > 0 && 'border-t border-line')}
          >
            <span class="text-sm text-ink">{entry.label}</span>
            <span class="flex items-center gap-2 text-xs text-soft">
              {entry.chords.map((chord, chordIndex) => (
                <span class="flex items-center gap-2" key={chord}>
                  {chordIndex > 0 && <span>/</span>}
                  <span>{formatShortcut(chord)}</span>
                </span>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
});
