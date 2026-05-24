import { cumulativeHeights, firstVisibleIndex, lastVisibleIndex, totalHeight } from '@renderer/ui/virtual/geometry';
import { Fragment } from 'preact';
import type { ComponentChildren, RefObject } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';

interface VirtualProps<T> {
  overscan?: number;
  items: ReadonlyArray<T>;
  getKey: (item: T) => string;
  estimateHeight: (item: T) => number;
  renderItem: (item: T) => ComponentChildren;
}

interface Range {
  end: number;
  start: number;
}

const defaultOverscan = 1500;
const initialViewportGuess = 3000;
const scrollOverflowValues = new Set(['auto', 'overlay', 'scroll']);

const initialEnd = (cumulative: Float64Array, viewportGuess: number) => {
  const last = cumulative.length - 1;
  for (let index = 0; index < last; index += 1) {
    if ((cumulative[index + 1] ?? 0) > viewportGuess) return index + 1;
  }
  return last;
};

const findScrollAncestor = (element: HTMLElement): HTMLElement | null => {
  let parent = element.parentElement;
  while (parent) {
    if (scrollOverflowValues.has(getComputedStyle(parent).overflowY)) return parent;
    parent = parent.parentElement;
  }
  return null;
};

const sameRange = (a: Range, b: Range) => a.start === b.start && a.end === b.end;

const rangeOf = (cumulative: Float64Array, scrollTop: number, scrollBottom: number, overscan: number): Range => ({
  end: lastVisibleIndex(cumulative, scrollBottom + overscan) + 1,
  start: firstVisibleIndex(cumulative, Math.max(0, scrollTop - overscan))
});

const useVisibleRange = (cumulative: Float64Array, overscan: number, containerRef: RefObject<HTMLElement>): Range => {
  const [range, setRange] = useState<Range>(() => ({ end: initialEnd(cumulative, initialViewportGuess), start: 0 }));

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scrollAncestor = findScrollAncestor(container);
    const scrollTarget: EventTarget = scrollAncestor ?? window;
    let rafId = 0;

    const computeRange = () => {
      const anchorTop = scrollAncestor ? scrollAncestor.getBoundingClientRect().top : 0;
      const containerRect = container.getBoundingClientRect();
      const viewportHeight = scrollAncestor ? scrollAncestor.clientHeight : window.innerHeight;
      const scrollTop = anchorTop - containerRect.top;
      const next = rangeOf(cumulative, scrollTop, scrollTop + viewportHeight, overscan);
      setRange((previous) => (sameRange(previous, next) ? previous : next));
    };

    const schedule = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        computeRange();
      });
    };

    scrollTarget.addEventListener('scroll', schedule, { passive: true });
    const resizeObserver = new ResizeObserver(schedule);
    if (scrollAncestor) resizeObserver.observe(scrollAncestor);
    else window.addEventListener('resize', schedule, { passive: true });

    computeRange();

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      scrollTarget.removeEventListener('scroll', schedule);
      resizeObserver.disconnect();
      if (!scrollAncestor) window.removeEventListener('resize', schedule);
    };
  }, [cumulative, overscan, containerRef]);

  return range;
};

export const Virtual = <T,>({
  items,
  getKey,
  overscan = defaultOverscan,
  renderItem,
  estimateHeight
}: VirtualProps<T>) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const heights = useMemo(() => items.map(estimateHeight), [items, estimateHeight]);
  const cumulative = useMemo(() => cumulativeHeights(heights), [heights]);
  const total = totalHeight(cumulative);
  const range = useVisibleRange(cumulative, overscan, containerRef);

  const limit = Math.max(0, cumulative.length - 1);
  const end = Math.min(range.end, limit);
  const start = Math.min(range.start, limit);
  const topSpacer = cumulative[start] ?? 0;
  const visible = items.slice(start, end);
  const bottomSpacer = Math.max(0, total - (cumulative[end] ?? total));

  return (
    <div ref={containerRef} class="min-w-0">
      <div aria-hidden="true" style={{ height: `${topSpacer}px` }} />
      {visible.map((item) => (
        <Fragment key={getKey(item)}>{renderItem(item)}</Fragment>
      ))}
      <div aria-hidden="true" style={{ height: `${bottomSpacer}px` }} />
    </div>
  );
};
