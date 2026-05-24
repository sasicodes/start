import { tw } from '@renderer/utils/tw';
import { memo } from 'preact/compat';

interface ShortcutsProps {
  composerShortcut: string;
}

interface ShortcutEntry {
  label: string;
  chords: string[];
}

const keySymbols: Record<string, string> = {
  alt: '⌥',
  cmd: '⌘',
  ctrl: '⌃',
  esc: '⎋',
  tab: '⇥',
  down: '↓',
  left: '←',
  meta: '⌘',
  right: '→',
  space: '␣',
  shift: '⇧',
  control: '⌃',
  arrowup: '↑',
  command: '⌘',
  enter: '↵',
  option: '⌥',
  return: '↵',
  escape: '⎋',
  arrowdown: '↓',
  arrowleft: '←',
  arrowright: '→',
  backspace: '⌫',
  up: '↑'
};

const formatChord = (chord: string) =>
  chord
    .split('+')
    .map((part) => keySymbols[part.toLowerCase()] ?? (part.length === 1 ? part.toUpperCase() : part))
    .join('');

export const Shortcuts = memo(({ composerShortcut }: ShortcutsProps) => {
  const entries: ShortcutEntry[] = [
    { label: 'New session', chords: ['Command+N', 'Command+T'] },
    { label: 'Quick access', chords: composerShortcut ? [composerShortcut] : [] },
    { label: 'Settings', chords: ['Command+,'] },
    { label: 'Keyboard shortcuts', chords: ['Command+/'] },
    { label: 'Toggle side panel', chords: [']'] },
    { label: 'Submit prompt', chords: ['Enter'] },
    { label: 'New line in prompt', chords: ['Shift+Enter'] },
    { label: 'Refill previous prompt', chords: ['Up'] },
    { label: 'Finder next', chords: ['Down'] },
    { label: 'Finder previous', chords: ['Up'] },
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
            <span class="flex items-center gap-3 font-mono text-xs text-soft">
              {entry.chords.map((chord) => (
                <span key={chord}>{formatChord(chord)}</span>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
});
