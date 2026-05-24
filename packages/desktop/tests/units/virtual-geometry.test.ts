import { cumulativeHeights, firstVisibleIndex, lastVisibleIndex, totalHeight } from '@renderer/ui/virtual/geometry';
import { describe, expect, it } from 'vitest';

describe('cumulativeHeights', () => {
  it('returns a [0] array for empty input', () => {
    const result = cumulativeHeights([]);
    expect(result.length).toBe(1);
    expect(result[0]).toBe(0);
  });

  it('returns running sums for non-empty input', () => {
    const result = cumulativeHeights([10, 20, 30]);
    expect(Array.from(result)).toEqual([0, 10, 30, 60]);
  });
});

describe('totalHeight', () => {
  it('returns 0 for an empty list', () => {
    expect(totalHeight(cumulativeHeights([]))).toBe(0);
  });

  it('returns the sum of all heights', () => {
    expect(totalHeight(cumulativeHeights([10, 20, 30]))).toBe(60);
  });
});

describe('firstVisibleIndex', () => {
  const cumulative = cumulativeHeights([100, 100, 100, 100, 100]);

  it('returns 0 when the list is empty', () => {
    expect(firstVisibleIndex(cumulativeHeights([]), 0)).toBe(0);
  });

  it('returns 0 for negative scroll positions', () => {
    expect(firstVisibleIndex(cumulative, -50)).toBe(0);
  });

  it('returns 0 when scrollTop is inside the first item', () => {
    expect(firstVisibleIndex(cumulative, 0)).toBe(0);
    expect(firstVisibleIndex(cumulative, 50)).toBe(0);
    expect(firstVisibleIndex(cumulative, 99)).toBe(0);
  });

  it('returns the next index when scrollTop equals a boundary', () => {
    expect(firstVisibleIndex(cumulative, 100)).toBe(1);
    expect(firstVisibleIndex(cumulative, 200)).toBe(2);
  });

  it('returns the containing index inside the middle of an item', () => {
    expect(firstVisibleIndex(cumulative, 250)).toBe(2);
    expect(firstVisibleIndex(cumulative, 449)).toBe(4);
  });

  it('caps at the last index when scrolled past the end', () => {
    expect(firstVisibleIndex(cumulative, 1000)).toBe(4);
  });
});

describe('lastVisibleIndex', () => {
  const cumulative = cumulativeHeights([100, 100, 100, 100, 100]);

  it('returns 0 when the list is empty', () => {
    expect(lastVisibleIndex(cumulativeHeights([]), 0)).toBe(0);
  });

  it('returns 0 when only the first item is visible', () => {
    expect(lastVisibleIndex(cumulative, 50)).toBe(0);
    expect(lastVisibleIndex(cumulative, 100)).toBe(0);
  });

  it('returns the last item whose top is inside the viewport', () => {
    expect(lastVisibleIndex(cumulative, 250)).toBe(2);
    expect(lastVisibleIndex(cumulative, 450)).toBe(4);
  });

  it('caps at the last index when the viewport extends past the end', () => {
    expect(lastVisibleIndex(cumulative, 9999)).toBe(4);
  });
});
