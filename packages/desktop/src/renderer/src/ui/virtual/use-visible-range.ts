import { initialVisibleEnd, initialVisibleStart, type VisibleRange, visibleRange } from '@renderer/ui/virtual/geometry';
import { findScrollAncestor } from '@renderer/ui/virtual/utils/scroll';
import { observeViewport } from '@renderer/ui/virtual/viewport';
import type { RefObject } from 'preact';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';

const initialViewportGuess = 3000;

const sameRange = (a: VisibleRange, b: VisibleRange) => a.start === b.start && a.end === b.end;

export const useVisibleRange = (
  cumulative: Float64Array,
  overscan: number,
  initialEnd: boolean,
  containerRef: RefObject<HTMLElement>
): VisibleRange => {
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
    const container = containerRef.current;
    if (!container) return;
    return observeViewport(container, compute);
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
