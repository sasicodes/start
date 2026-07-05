import { moveId } from '@renderer/shared/composer/use-reorder';
import { describe, expect, it } from 'vitest';

describe('moveId', () => {
  const ids = ['a', 'b', 'c', 'd'];

  it('moves a dragged id down before the hovered id', () => {
    expect(moveId(ids, 'a', 'c')).toEqual(['b', 'c', 'a', 'd']);
  });

  it('moves a dragged id up before the hovered id', () => {
    expect(moveId(ids, 'd', 'b')).toEqual(['a', 'd', 'b', 'c']);
  });

  it('returns the same reference when nothing changes', () => {
    expect(moveId(ids, 'a', 'a')).toBe(ids);
  });

  it('returns the same reference for unknown ids', () => {
    expect(moveId(ids, 'a', 'z')).toBe(ids);
  });
});
