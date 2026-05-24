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
