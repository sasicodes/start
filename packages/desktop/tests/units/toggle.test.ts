import { effectiveOpen, toggleOpen } from '@renderer/shared/workspace/changes/diff/toggle';
import { describe, expect, it } from 'vitest';

describe('effectiveOpen', () => {
  it('returns the default when the key is absent', () => {
    expect(effectiveOpen(new Map(), 'a', true)).toBe(true);
    expect(effectiveOpen(new Map(), 'a', false)).toBe(false);
  });

  it('returns the override when the key is present', () => {
    expect(effectiveOpen(new Map([['a', false]]), 'a', true)).toBe(false);
    expect(effectiveOpen(new Map([['a', true]]), 'a', false)).toBe(true);
  });
});

describe('toggleOpen', () => {
  it('stores the inverted state without mutating the source map', () => {
    const source = new Map<string, boolean>();
    const next = toggleOpen(source, 'a', true);
    expect(next.get('a')).toBe(false);
    expect(source.has('a')).toBe(false);
  });

  it('closes an open-by-default entry on the first toggle', () => {
    const toggled = new Map<string, boolean>();
    const next = toggleOpen(toggled, 'a', true);
    expect(effectiveOpen(next, 'a', true)).toBe(false);
  });

  it('opens a closed-by-default entry on the first toggle', () => {
    const toggled = new Map<string, boolean>();
    const next = toggleOpen(toggled, 'a', false);
    expect(effectiveOpen(next, 'a', false)).toBe(true);
  });

  it('flips an existing override', () => {
    const toggled = new Map([['a', true]]);
    const next = toggleOpen(toggled, 'a', true);
    expect(effectiveOpen(next, 'a', false)).toBe(false);
  });
});
