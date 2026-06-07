import { shortcutKeys } from '@renderer/shared/shortcuts/format';
import { describe, expect, it } from 'vitest';

describe('shortcutKeys', () => {
  it('splits a command chord into per-key symbols', () => {
    expect(shortcutKeys('Command+/')).toEqual(['⌘', '/']);
  });

  it('returns a single key for a literal chord', () => {
    expect(shortcutKeys(']')).toEqual([']']);
  });

  it('handles an empty chord', () => {
    expect(shortcutKeys('')).toEqual(['']);
  });
});
