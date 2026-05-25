import { formatShortcut } from '@renderer/shared/shortcuts/format';
import { describe, expect, it } from 'vitest';

describe('formatShortcut', () => {
  it('shows the literal right bracket key with its verbal label', () => {
    expect(formatShortcut(']')).toBe('Right Bracket (])');
  });

  it('keeps command shortcuts readable while showing platform symbols', () => {
    expect(formatShortcut('Command+/')).toBe('Cmd + / (⌘ /)');
  });

  it('falls back to the source chord when formatting fails', () => {
    expect(formatShortcut('')).toBe('');
  });
});
