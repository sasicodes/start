import { reorder } from '@renderer/shared/composer/use-reorder';
import { describe, expect, it } from 'vitest';

describe('reorder', () => {
  const ids = ['a', 'b', 'c', 'd'];

  it('inserts the dragged id at the target slot', () => {
    expect(reorder(ids, 'a', 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(reorder(ids, 'd', 1)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('clamps the index to the list bounds', () => {
    expect(reorder(ids, 'b', -5)).toEqual(['b', 'a', 'c', 'd']);
    expect(reorder(ids, 'b', 99)).toEqual(['a', 'c', 'd', 'b']);
  });

  it('keeps a stable slot when the index matches the current position', () => {
    expect(reorder(ids, 'c', 2)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('returns the same reference for an unknown id', () => {
    expect(reorder(ids, 'z', 1)).toBe(ids);
  });
});
