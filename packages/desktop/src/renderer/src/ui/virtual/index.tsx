import type { VisibleRange } from '@renderer/ui/virtual/geometry';
import {
  cumulativeHeights,
  firstVisibleIndex,
  initialVisibleEnd,
  initialVisibleStart,
  measuredPrependShift,
  resolveItemHeight,
  shouldCompensateMeasuredDelta,
  shouldPreserveScrollEnd,
  totalHeight,
  visibleRange
} from '@renderer/ui/virtual/geometry';
import { tw } from '@renderer/utils/tw';
import type { ComponentChildren, RefObject } from 'preact';
import { Fragment } from 'preact';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';

export interface VirtualHandle {
  scrollToIndex: (index: number) => boolean;
  scrollTopForIndex: (index: number) => number | null;
}

interface VirtualProps<T> {
  gap?: number;
  overscan?: number;
  className?: string;
  initialEnd?: boolean;
  itemClassName?: string;
  items: ReadonlyArray<T>;
  preserveScrollEnd?: boolean;
  getKey: (item: T) => string;
  estimateHeight: (item: T) => number;
  apiRef?: RefObject<VirtualHandle | null>;
  onRangeChange?: (range: VisibleRange) => void;
  renderItem: (item: T, index: number) => ComponentChildren;
}

interface MeasuredItemProps {
  itemKey: string;
  className: string;
  children: ComponentChildren;
  onHeight: (key: string, height: number) => void;
}

const pinnedThreshold = 24;
const defaultOverscan = 1500;
const initialViewportGuess = 3000;
const scrollOverflowValues = new Set(['auto', 'overlay', 'scroll']);

const findScrollAncestor = (element: HTMLElement): HTMLElement | null => {
  let parent = element.parentElement;
  while (parent) {
    if (scrollOverflowValues.has(getComputedStyle(parent).overflowY)) return parent;
    parent = parent.parentElement;
  }
  return null;
};

const sameRange = (a: VisibleRange, b: VisibleRange) => a.start === b.start && a.end === b.end;

const useVisibleRange = (
  cumulative: Float64Array,
  overscan: number,
  initialEnd: boolean,
  containerRef: RefObject<HTMLElement>
): VisibleRange => {
  const frameRef = useRef(0);
  const initialEndRef = useRef(initialEnd);
  const cumulativeRef = useRef(cumulative);
  const [range, setRange] = useState<VisibleRange>(() =>
    initialEnd
      ? { end: cumulative.length - 1, start: initialVisibleStart(cumulative, initialViewportGuess) }
      : { start: 0, end: initialVisibleEnd(cumulative, initialViewportGuess) }
  );

  cumulativeRef.current = cumulative;

  const compute = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const scrollAncestor = findScrollAncestor(container);
    const anchorTop = scrollAncestor ? scrollAncestor.getBoundingClientRect().top : 0;
    const containerRect = container.getBoundingClientRect();
    const viewportHeight = scrollAncestor ? scrollAncestor.clientHeight : window.innerHeight;
    const scrollTop = anchorTop - containerRect.top;
    const next = visibleRange(cumulativeRef.current, scrollTop, scrollTop + viewportHeight, overscan);
    setRange((previous) => (sameRange(previous, next) ? previous : next));
  }, [overscan, containerRef]);

  useEffect(() => {
    let ancestor: HTMLElement | null = null;
    let lastTop = Number.NaN;
    let lastHeight = Number.NaN;

    const tick = () => {
      const container = containerRef.current;
      if (container) {
        if (!ancestor?.isConnected) ancestor = findScrollAncestor(container);
        const top = ancestor ? ancestor.scrollTop : window.scrollY;
        const height = ancestor ? ancestor.clientHeight : window.innerHeight;
        if (top !== lastTop || height !== lastHeight) {
          lastTop = top;
          lastHeight = height;
          compute();
        }
      }
      frameRef.current = window.requestAnimationFrame(tick);
    };

    frameRef.current = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameRef.current);
  }, [compute, containerRef]);

  useLayoutEffect(() => {
    if (initialEndRef.current) {
      initialEndRef.current = false;
      return;
    }
    compute();
  }, [compute, cumulative]);

  return range;
};

const MeasuredItem = ({ itemKey, className, children, onHeight }: MeasuredItemProps) => {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    const measure = () => onHeight(itemKey, element.offsetHeight);
    const observer = new ResizeObserver(measure);
    measure();
    observer.observe(element);
    return () => observer.disconnect();
  }, [itemKey, onHeight]);

  return (
    <div ref={ref} class={tw('min-w-0', className)}>
      {children}
    </div>
  );
};

export const Virtual = <T,>({
  items,
  getKey,
  apiRef,
  gap = 0,
  renderItem,
  onRangeChange,
  className = '',
  estimateHeight,
  initialEnd = false,
  itemClassName = '',
  preserveScrollEnd = false,
  overscan = defaultOverscan
}: VirtualProps<T>) => {
  const itemsRef = useRef(items);
  const pinnedRef = useRef(true);
  const firstKeyRef = useRef('');
  const appliedScrollDeltaRef = useRef(0);
  const totalRef = useRef<number | null>(null);
  const estimateHeightRef = useRef(estimateHeight);
  const containerRef = useRef<HTMLDivElement>(null);
  const committedKeysRef = useRef(new Set<string>());
  const itemIndexRef = useRef(new Map<string, number>());
  const preserveScrollEndRef = useRef(preserveScrollEnd);
  const [heightRevision, setHeightRevision] = useState(0);
  const heightCacheRef = useRef(new Map<string, number>());
  const cumulativeRef = useRef<Float64Array>(cumulativeHeights([]));

  itemsRef.current = items;
  estimateHeightRef.current = estimateHeight;
  preserveScrollEndRef.current = preserveScrollEnd;

  const heights = useMemo(() => {
    const last = items.length - 1;
    const nextIndexes = new Map<string, number>();
    const nextHeights = items.map((item, index) => {
      const key = getKey(item);
      nextIndexes.set(key, index);
      return resolveItemHeight(heightCacheRef.current.get(key), estimateHeight(item), index < last ? gap : 0);
    });

    itemIndexRef.current = nextIndexes;
    return nextHeights;
  }, [gap, items, getKey, estimateHeight, heightRevision]);
  const cumulative = useMemo(() => cumulativeHeights(heights), [heights]);
  const total = totalHeight(cumulative);
  const range = useVisibleRange(cumulative, overscan, initialEnd, containerRef);

  cumulativeRef.current = cumulative;

  const scrollTopForIndex = useCallback((index: number) => {
    const container = containerRef.current;
    const cumulativeHeightsRef = cumulativeRef.current;
    const last = cumulativeHeightsRef.length - 2;
    if (!container || index < 0 || index > last) return null;

    const scrollAncestor = findScrollAncestor(container);
    const offset = cumulativeHeightsRef[index] ?? 0;
    const containerTop = container.getBoundingClientRect().top;

    if (!scrollAncestor) return window.scrollY + containerTop + offset;

    const topInset = Number.parseFloat(getComputedStyle(scrollAncestor).paddingTop) || 0;
    return scrollAncestor.scrollTop + containerTop - scrollAncestor.getBoundingClientRect().top - topInset + offset;
  }, []);

  const scrollToIndex = useCallback(
    (index: number) => {
      const scrollTop = scrollTopForIndex(index);
      if (scrollTop === null) return false;

      const container = containerRef.current;
      const scrollAncestor = container ? findScrollAncestor(container) : null;
      if (scrollAncestor) scrollAncestor.scrollTop = Math.ceil(scrollTop);
      else window.scrollTo({ top: Math.ceil(scrollTop) });
      return true;
    },
    [scrollTopForIndex]
  );

  const setMeasuredHeight = useCallback((key: string, height: number) => {
    const current = heightCacheRef.current.get(key);
    const index = itemIndexRef.current.get(key);
    const item = typeof index === 'number' ? itemsRef.current[index] : null;
    const previous = current ?? (item ? estimateHeightRef.current(item) : height);
    if (previous === height) return;

    const container = containerRef.current;
    const scrollAncestor = container ? findScrollAncestor(container) : null;
    const scrollTop =
      container && scrollAncestor
        ? scrollAncestor.getBoundingClientRect().top - container.getBoundingClientRect().top
        : 0;
    const firstVisible = firstVisibleIndex(cumulativeRef.current, scrollTop);
    const heightDelta = height - previous;
    const distanceFromEnd = scrollAncestor
      ? scrollAncestor.scrollHeight - scrollAncestor.clientHeight - scrollAncestor.scrollTop
      : 0;

    const committed = committedKeysRef.current.has(key);
    const anchorAbove = typeof index === 'number' && index < firstVisible;
    const pinnedToEnd =
      preserveScrollEndRef.current &&
      (pinnedRef.current || shouldPreserveScrollEnd(distanceFromEnd, heightDelta, pinnedThreshold));

    heightCacheRef.current.set(key, height);
    if (scrollAncestor && shouldCompensateMeasuredDelta(committed, anchorAbove, pinnedToEnd)) {
      scrollAncestor.scrollTop += heightDelta;
      appliedScrollDeltaRef.current += heightDelta;
      if (pinnedToEnd) pinnedRef.current = true;
    }
    setHeightRevision((revision) => revision + 1);
  }, []);

  useLayoutEffect(() => {
    const firstItem = items[0];
    const firstKey = firstItem ? getKey(firstItem) : '';
    const previousFirstKey = firstKeyRef.current;
    firstKeyRef.current = firstKey;
    if (!previousFirstKey || previousFirstKey === firstKey) return;
    if (preserveScrollEnd && pinnedRef.current) return;

    const anchorIndex = itemIndexRef.current.get(previousFirstKey) ?? 0;
    const shift = measuredPrependShift(
      items,
      anchorIndex,
      gap,
      getKey,
      heightCacheRef.current,
      estimateHeightRef.current
    );
    if (shift <= 0) return;

    const container = containerRef.current;
    const scrollAncestor = container ? findScrollAncestor(container) : null;
    if (!scrollAncestor) return;

    scrollAncestor.scrollTop += shift;
    appliedScrollDeltaRef.current += shift;
  }, [gap, items, getKey, preserveScrollEnd]);

  useLayoutEffect(() => {
    const keys = new Set(items.map(getKey));
    committedKeysRef.current = keys;
    for (const key of heightCacheRef.current.keys()) {
      if (!keys.has(key)) heightCacheRef.current.delete(key);
    }
  }, [items, getKey]);

  useLayoutEffect(() => {
    if (totalRef.current === null) {
      totalRef.current = total;
      return;
    }

    const totalDelta = total - totalRef.current;
    const heightDelta = totalDelta - appliedScrollDeltaRef.current;
    appliedScrollDeltaRef.current = 0;
    totalRef.current = total;
    if (heightDelta <= 0) return;

    const container = containerRef.current;
    const scrollAncestor = container ? findScrollAncestor(container) : null;
    const distanceFromEnd = scrollAncestor
      ? scrollAncestor.scrollHeight - scrollAncestor.clientHeight - scrollAncestor.scrollTop
      : 0;

    if (
      scrollAncestor &&
      preserveScrollEnd &&
      (pinnedRef.current || shouldPreserveScrollEnd(distanceFromEnd, heightDelta, pinnedThreshold))
    ) {
      scrollAncestor.scrollTop += heightDelta;
      pinnedRef.current = true;
    }
  }, [total, preserveScrollEnd]);

  useEffect(() => {
    if (!preserveScrollEnd) return;

    const container = containerRef.current;
    const scrollAncestor = container ? findScrollAncestor(container) : null;
    if (!scrollAncestor) return;

    const syncPinned = () => {
      pinnedRef.current =
        scrollAncestor.scrollHeight - scrollAncestor.clientHeight - scrollAncestor.scrollTop <= pinnedThreshold;
    };

    scrollAncestor.addEventListener('scroll', syncPinned, { passive: true });
    syncPinned();
    return () => scrollAncestor.removeEventListener('scroll', syncPinned);
  }, [preserveScrollEnd]);

  useLayoutEffect(() => {
    if (!apiRef) return;

    apiRef.current = { scrollToIndex, scrollTopForIndex };
    return () => {
      apiRef.current = null;
    };
  }, [apiRef, scrollToIndex, scrollTopForIndex]);

  useLayoutEffect(() => {
    onRangeChange?.(range);
  }, [range, onRangeChange]);

  const limit = Math.max(0, cumulative.length - 1);
  const end = Math.min(range.end, limit);
  const start = Math.min(range.start, limit);
  const topSpacer = cumulative[start] ?? 0;
  const visible = items.slice(start, end);
  const bottomSpacer = Math.max(0, total - (cumulative[end] ?? total));

  return (
    <div ref={containerRef} class={tw('min-w-0', className)}>
      <div aria-hidden="true" style={{ height: `${topSpacer}px` }} />
      {visible.map((item, visibleIndex) => {
        const index = start + visibleIndex;
        const key = getKey(item);
        return (
          <Fragment key={key}>
            <MeasuredItem itemKey={key} className={itemClassName} onHeight={setMeasuredHeight}>
              {renderItem(item, index)}
            </MeasuredItem>
            {gap > 0 && index < items.length - 1 && <div aria-hidden="true" style={{ height: `${gap}px` }} />}
          </Fragment>
        );
      })}
      <div aria-hidden="true" style={{ height: `${bottomSpacer}px` }} />
    </div>
  );
};
