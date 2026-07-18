export interface VisibleRange {
  end: number;
  start: number;
}

export const shouldPreserveScrollEnd = (distanceFromEnd: number, heightDelta: number, threshold: number) =>
  heightDelta > 0 && distanceFromEnd - heightDelta <= threshold;

export const shouldCompensateMeasuredDelta = (committed: boolean, anchorAbove: boolean, pinnedToEnd: boolean) =>
  committed && (anchorAbove || pinnedToEnd);

export const cumulativeHeights = (heights: ReadonlyArray<number>): Float64Array => {
  const result = new Float64Array(heights.length + 1);
  for (let index = 0; index < heights.length; index += 1) {
    result[index + 1] = (result[index] ?? 0) + (heights[index] ?? 0);
  }
  return result;
};

export const firstVisibleIndex = (cumulative: Float64Array, scrollTop: number) => {
  const last = cumulative.length - 2;
  if (last < 0) return 0;
  if (scrollTop <= 0) return 0;

  let low = 0;
  let high = last;
  while (low < high) {
    const mid = (low + high + 1) >>> 1;
    if ((cumulative[mid] ?? 0) <= scrollTop) low = mid;
    else high = mid - 1;
  }
  return low;
};

export const lastVisibleIndex = (cumulative: Float64Array, scrollBottom: number) => {
  const last = cumulative.length - 2;
  if (last < 0) return 0;

  let low = 0;
  let high = last;
  while (low < high) {
    const mid = (low + high + 1) >>> 1;
    if ((cumulative[mid] ?? 0) < scrollBottom) low = mid;
    else high = mid - 1;
  }
  return low;
};

export const totalHeight = (cumulative: Float64Array) => cumulative[cumulative.length - 1] ?? 0;

export const measuredPrependShift = <T>(
  items: ReadonlyArray<T>,
  anchorIndex: number,
  gap: number,
  getKey: (item: T) => string,
  heights: ReadonlyMap<string, number>,
  estimate: (item: T) => number
) => {
  let shift = 0;
  for (const [index, item] of items.entries()) {
    if (index >= anchorIndex) break;
    shift += (heights.get(getKey(item)) ?? estimate(item)) + gap;
  }
  return shift;
};

export const resolveItemHeight = (cachedHeight: number | undefined, estimatedHeight: number, gap: number) =>
  (cachedHeight ?? estimatedHeight) + gap;

export const initialVisibleEnd = (cumulative: Float64Array, viewportGuess: number) => {
  const last = cumulative.length - 1;
  for (let index = 0; index < last; index += 1) {
    if ((cumulative[index + 1] ?? 0) > viewportGuess) return index + 1;
  }
  return last;
};

export const initialVisibleStart = (cumulative: Float64Array, viewportGuess: number) =>
  firstVisibleIndex(cumulative, Math.max(0, totalHeight(cumulative) - viewportGuess));

export const visibleRange = (
  cumulative: Float64Array,
  scrollTop: number,
  scrollBottom: number,
  overscan: number
): VisibleRange => ({
  end: lastVisibleIndex(cumulative, scrollBottom + overscan) + 1,
  start: firstVisibleIndex(cumulative, Math.max(0, scrollTop - overscan))
});
