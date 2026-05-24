import { cumulativeHeights, firstVisibleIndex, lastVisibleIndex, totalHeight } from '@renderer/ui/virtual/geometry';
import { Fragment } from 'preact';
import type { ComponentChildren } from 'preact';
import { memo } from 'preact/compat';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';

interface VirtualProps<T> {
  items: ReadonlyArray<T>;
  overscan?: number;
  getKey: (item: T) => string;
  renderItem: (item: T) => ComponentChildren;
  estimateHeight: (item: T) => number;
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

const VirtualInner = <T,>({
  items,
  getKey,
  renderItem,
  estimateHeight,
  overscan = defaultOverscan
}: VirtualProps<T>) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const heights = useMemo(() => items.map(estimateHeight), [items, estimateHeight]);
  const cumulative = useMemo(() => cumulativeHeights(heights), [heights]);
  const total = totalHeight(cumulative);
  const [range, setRange] = useState<Range>(() => ({ end: initialEnd(cumulative, initialViewportGuess), start: 0 }));

  useLayoutEffect(() => {
    const limit = Math.max(0, cumulative.length - 1);
    setRange((previous) =>
      previous.end <= limit && previous.start <= limit
        ? previous
        : { end: Math.min(previous.end, limit), start: Math.min(previous.start, limit) }
    );
  }, [cumulative]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scrollAncestor = findScrollAncestor(container);
    const scrollTarget: EventTarget = scrollAncestor ?? window;
    let rafId = 0;

    const computeRange = () => {
      const containerRect = container.getBoundingClientRect();
      const viewportHeight = scrollAncestor ? scrollAncestor.clientHeight : window.innerHeight;
      const scrollTop = -containerRect.top;
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
  }, [cumulative, overscan]);

  const topSpacer = cumulative[range.start] ?? 0;
  const bottomSpacer = Math.max(0, total - (cumulative[range.end] ?? total));
  const visible = items.slice(range.start, range.end);

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

export const Virtual = memo(VirtualInner) as typeof VirtualInner;
