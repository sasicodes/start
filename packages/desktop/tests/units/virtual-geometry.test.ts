import {
  totalHeight,
  visibleRange,
  resolveItemHeight,
  lastVisibleIndex,
  cumulativeHeights,
  firstVisibleIndex,
  initialVisibleEnd,
  measuredPrependShift,
  shouldPreserveScrollEnd,
  shouldCompensateMeasuredDelta
} from '@renderer/ui/virtual/geometry';
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

describe('initialVisibleEnd', () => {
  it('includes rows until the viewport guess is filled', () => {
    expect(initialVisibleEnd(cumulativeHeights([40, 50, 60]), 70)).toBe(2);
  });

  it('returns the list end when estimates are shorter than the viewport guess', () => {
    expect(initialVisibleEnd(cumulativeHeights([40, 50, 60]), 500)).toBe(3);
  });
});

describe('visibleRange', () => {
  const cumulative = cumulativeHeights([100, 100, 100, 100, 100]);

  it('returns the viewport range with no overscan', () => {
    expect(visibleRange(cumulative, 120, 280, 0)).toEqual({ end: 3, start: 1 });
  });

  it('expands the range by overscan in both directions', () => {
    expect(visibleRange(cumulative, 220, 320, 75)).toEqual({ end: 4, start: 1 });
  });

  it('keeps the start at 0 when overscan reaches above the list', () => {
    expect(visibleRange(cumulative, 20, 80, 100)).toEqual({ end: 2, start: 0 });
  });
});

describe('resolveItemHeight', () => {
  it('trusts a measured height even when the estimate overshoots it', () => {
    expect(resolveItemHeight(120, 300, 0)).toBe(120);
  });

  it('falls back to the estimate when the item is unmeasured', () => {
    expect(resolveItemHeight(undefined, 300, 0)).toBe(300);
  });

  it('adds the trailing gap to either source', () => {
    expect(resolveItemHeight(120, 300, 12)).toBe(132);
    expect(resolveItemHeight(undefined, 300, 12)).toBe(312);
  });
});

const itemKey = (item: string) => item;

describe('measuredPrependShift', () => {
  const estimate = () => 100;
  const items = ['p1', 'p2', 'a', 'b'];

  it('returns 0 when nothing was inserted above the anchor', () => {
    expect(measuredPrependShift(items, 0, 12, itemKey, new Map(), estimate)).toBe(0);
  });

  it('returns 0 for non-positive anchors', () => {
    expect(measuredPrependShift(items, -1, 12, itemKey, new Map(), estimate)).toBe(0);
  });

  it('sums measured heights and gaps for the prepended block', () => {
    const measured = new Map([
      ['p1', 37],
      ['p2', 253]
    ]);
    expect(measuredPrependShift(items, 2, 12, itemKey, measured, estimate)).toBe(37 + 12 + 253 + 12);
  });

  it('falls back to estimates for prepended items that never mounted', () => {
    expect(measuredPrependShift(items, 2, 12, itemKey, new Map(), estimate)).toBe(224);
  });

  it('mixes measured and estimated heights per item', () => {
    const measured = new Map([['p1', 40]]);
    expect(measuredPrependShift(items, 2, 12, itemKey, measured, estimate)).toBe(40 + 12 + 100 + 12);
  });

  it('ignores measurements at and below the anchor', () => {
    const measured = new Map([
      ['p1', 40],
      ['a', 999],
      ['b', 999]
    ]);
    expect(measuredPrependShift(items, 1, 0, itemKey, measured, estimate)).toBe(40);
  });
});

describe('shouldCompensateMeasuredDelta', () => {
  it('skips keys that were absent from the previous commit', () => {
    expect(shouldCompensateMeasuredDelta(false, true, false)).toBe(false);
    expect(shouldCompensateMeasuredDelta(false, false, true)).toBe(false);
    expect(shouldCompensateMeasuredDelta(false, true, true)).toBe(false);
  });

  it('compensates committed items above the viewport', () => {
    expect(shouldCompensateMeasuredDelta(true, true, false)).toBe(true);
  });

  it('compensates committed items while pinned to the end', () => {
    expect(shouldCompensateMeasuredDelta(true, false, true)).toBe(true);
  });

  it('leaves committed items below an unpinned viewport alone', () => {
    expect(shouldCompensateMeasuredDelta(true, false, false)).toBe(false);
  });
});

describe('prepend anchoring', () => {
  const gap = 12;
  const scrollTop = 40;
  const anchorIndex = 2;
  const items = ['p1', 'p2', 'a', 'b', 'c'];
  const estimates = new Map([
    ['p1', 100],
    ['p2', 100]
  ]);
  const estimate = (item: string) => estimates.get(item) ?? 0;
  const mountedCache = () =>
    new Map([
      ['a', 50],
      ['b', 60],
      ['c', 70]
    ]);

  const measureMountedItems = (cache: Map<string, number>, committedKeys: Set<string>) => {
    let compensation = 0;
    for (const [key, height] of [
      ['p1', 37],
      ['p2', 253]
    ] as const) {
      const delta = height - estimate(key);
      cache.set(key, height);
      if (shouldCompensateMeasuredDelta(committedKeys.has(key), true, false)) compensation += delta;
    }
    return compensation;
  };

  const anchorOffset = (cache: Map<string, number>) => {
    const heights = items.map((item, index) => {
      const base = cache.get(item) ?? estimate(item);
      return index < items.length - 1 ? base + gap : base;
    });
    return cumulativeHeights(heights)[anchorIndex] ?? 0;
  };

  it('keeps the anchor stationary when prepended items measure differently from their estimates', () => {
    const cache = mountedCache();

    const compensation = measureMountedItems(cache, new Set(['a', 'b', 'c']));
    const shift = measuredPrependShift(items, anchorIndex, gap, itemKey, cache, estimate);

    expect(compensation).toBe(0);
    expect(scrollTop + compensation + shift - anchorOffset(cache)).toBe(scrollTop);
  });

  it('drifts the anchor when the shift trusts estimates over fresh measurements', () => {
    const cache = mountedCache();
    const estimatedShift = measuredPrependShift(items, anchorIndex, gap, itemKey, new Map(), estimate);

    measureMountedItems(cache, new Set(['a', 'b', 'c']));

    expect(scrollTop + estimatedShift - anchorOffset(cache)).not.toBe(scrollTop);
  });

  it('double-compensates when measured deltas also adjust scroll for prepended keys', () => {
    const cache = mountedCache();

    const compensation = measureMountedItems(cache, new Set(items));
    const shift = measuredPrependShift(items, anchorIndex, gap, itemKey, cache, estimate);

    expect(compensation).not.toBe(0);
    expect(scrollTop + compensation + shift - anchorOffset(cache)).not.toBe(scrollTop);
  });

  it('stays stable when prepended items remain unmounted above the range', () => {
    const cache = mountedCache();

    const shift = measuredPrependShift(items, anchorIndex, gap, itemKey, cache, estimate);

    expect(scrollTop + shift - anchorOffset(cache)).toBe(scrollTop);
  });
});

describe('shouldPreserveScrollEnd', () => {
  it('preserves when growth moved a pinned viewport away from the end', () => {
    expect(shouldPreserveScrollEnd(40, 30, 24)).toBe(true);
  });

  it('does not preserve when the viewport was already away from the end', () => {
    expect(shouldPreserveScrollEnd(80, 30, 24)).toBe(false);
  });

  it('ignores shrink changes', () => {
    expect(shouldPreserveScrollEnd(0, -30, 24)).toBe(false);
  });
});
