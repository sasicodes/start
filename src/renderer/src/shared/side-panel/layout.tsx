import {
  clamp,
  getResizeCursor,
  getSidePanelCollapseWidth,
  maxSidePanelWindowRatio,
  readStoredSidePanelWidth,
  sidePanelSettleDurationMs,
  type ResizeCursor,
  writeStoredSidePanelWidth
} from '@renderer/shared/side-panel/width';
import { closeMotionTransition, openMotionTransition } from '@renderer/ui/motion';
import { cn } from '@renderer/utils/cn';
import { AnimatePresence, motion } from 'motion/react';
import type { ComponentChildren, JSX } from 'preact';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';

type SidePanelLayoutProps = {
  children: ComponentChildren;
  sidePanel: ComponentChildren;
  sidePanelLabel: string;
  sidePanelVisible: boolean;
  defaultSidePanelWidth?: number;
  maxSidePanelWidth?: number;
  minSidePanelWidth?: number;
  onSidePanelCollapse?: () => void;
};

const defaultMinContentWidth = 320;
const defaultMinSidePanelWidth = 320;
const defaultSidePanelWidth = 480;
const sidePanelHiddenState = { opacity: 0, transition: closeMotionTransition, x: '1rem' };
const sidePanelVisibleState = { opacity: 1, transition: openMotionTransition, x: 0 };

export const SidePanelLayout = ({
  children,
  sidePanel,
  sidePanelLabel,
  sidePanelVisible,
  onSidePanelCollapse,
  maxSidePanelWidth,
  minSidePanelWidth = defaultMinSidePanelWidth,
  defaultSidePanelWidth: fallbackSidePanelWidth = defaultSidePanelWidth
}: SidePanelLayoutProps) => {
  const [resizing, setResizing] = useState(false);
  const [settling, setSettling] = useState(false);
  const [storedInitialSidePanelWidth] = useState(() => readStoredSidePanelWidth() ?? fallbackSidePanelWidth);
  const rootRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController>();
  const frameRef = useRef<number>();
  const settleFrameRef = useRef<number>();
  const lastClientXRef = useRef(0);
  const rawSidePanelWidthRef = useRef(storedInitialSidePanelWidth);
  const resizingRef = useRef(false);
  const settleTimeoutRef = useRef<number>();
  const startClientXRef = useRef(0);
  const startWidthRef = useRef(storedInitialSidePanelWidth);
  const widthRef = useRef(storedInitialSidePanelWidth);
  const preferredSidePanelWidthRef = useRef(storedInitialSidePanelWidth);
  const interactionStyleRef = useRef({ bodyCursor: '', htmlCursor: '', userSelect: '' });

  const getSidePanelMaxWidth = useCallback(() => {
    const rootWidth = rootRef.current?.clientWidth ?? window.innerWidth;
    const maxContentWidth = rootWidth - defaultMinContentWidth;
    const maxWindowWidth = rootWidth * maxSidePanelWindowRatio;
    const maxConfiguredWidth = maxSidePanelWidth ?? Number.POSITIVE_INFINITY;
    return Math.max(minSidePanelWidth, Math.min(maxConfiguredWidth, maxContentWidth, maxWindowWidth));
  }, [maxSidePanelWidth, minSidePanelWidth]);

  const setSidePanelWidth = useCallback((width: number) => {
    widthRef.current = width;
    rootRef.current?.style.setProperty('--side-panel-width', `${width}px`);
  }, []);

  const applySidePanelWidth = useCallback(
    (width: number, savePreference = false) => {
      const nextWidth = clamp(width, minSidePanelWidth, getSidePanelMaxWidth());
      setSidePanelWidth(nextWidth);
      if (savePreference) preferredSidePanelWidthRef.current = nextWidth;
    },
    [getSidePanelMaxWidth, minSidePanelWidth, setSidePanelWidth]
  );

  const applyDraggingSidePanelWidth = useCallback(
    (width: number) => {
      if (width < minSidePanelWidth) {
        setSidePanelWidth(Math.max(width, getSidePanelCollapseWidth(minSidePanelWidth)));
        return;
      }

      applySidePanelWidth(width, true);
    },
    [applySidePanelWidth, minSidePanelWidth, setSidePanelWidth]
  );

  const setDocumentCursor = useCallback((cursor: ResizeCursor) => {
    document.documentElement.style.cursor = cursor;
    document.body.style.cursor = cursor;
  }, []);

  const clearSidePanelSettle = useCallback(() => {
    if (settleFrameRef.current) {
      cancelAnimationFrame(settleFrameRef.current);
      settleFrameRef.current = undefined;
    }

    if (settleTimeoutRef.current) {
      window.clearTimeout(settleTimeoutRef.current);
      settleTimeoutRef.current = undefined;
    }
  }, []);

  const stopResize = useCallback(() => {
    if (!resizingRef.current) return;

    resizingRef.current = false;
    abortRef.current?.abort();
    abortRef.current = undefined;

    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = undefined;
    }

    document.documentElement.style.cursor = interactionStyleRef.current.htmlCursor;
    document.body.style.cursor = interactionStyleRef.current.bodyCursor;
    document.body.style.userSelect = interactionStyleRef.current.userSelect;
    setResizing(false);
  }, []);

  const settleSidePanelWidth = useCallback(
    (width: number) => {
      clearSidePanelSettle();
      setSettling(true);
      stopResize();

      settleFrameRef.current = requestAnimationFrame(() => {
        settleFrameRef.current = undefined;
        applySidePanelWidth(width, true);
        settleTimeoutRef.current = window.setTimeout(() => {
          settleTimeoutRef.current = undefined;
          setSettling(false);
        }, sidePanelSettleDurationMs);
      });
    },
    [applySidePanelWidth, clearSidePanelSettle, stopResize]
  );

  const finishResize = useCallback(() => {
    const rawSidePanelWidth = rawSidePanelWidthRef.current;
    const nextSidePanelWidth =
      rawSidePanelWidth < minSidePanelWidth ? minSidePanelWidth : preferredSidePanelWidthRef.current;

    if (rawSidePanelWidth <= getSidePanelCollapseWidth(minSidePanelWidth)) {
      stopResize();
      onSidePanelCollapse?.();
      return;
    }

    writeStoredSidePanelWidth(nextSidePanelWidth);

    if (rawSidePanelWidth < minSidePanelWidth) {
      preferredSidePanelWidthRef.current = nextSidePanelWidth;
      settleSidePanelWidth(nextSidePanelWidth);
      return;
    }

    stopResize();
  }, [minSidePanelWidth, onSidePanelCollapse, settleSidePanelWidth, stopResize]);

  const scheduleResize = useCallback(
    (event: PointerEvent) => {
      lastClientXRef.current = event.clientX;
      if (frameRef.current) return;

      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = undefined;

        const currentX = lastClientXRef.current;
        const nextWidth = startWidthRef.current + startClientXRef.current - currentX;
        rawSidePanelWidthRef.current = nextWidth;
        setDocumentCursor(getResizeCursor(startClientXRef.current, currentX));
        applyDraggingSidePanelWidth(nextWidth);
      });
    },
    [applyDraggingSidePanelWidth, setDocumentCursor]
  );

  const startResize = useCallback(
    (event: JSX.TargetedPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;

      event.preventDefault();
      event.stopPropagation();

      clearSidePanelSettle();
      setSettling(false);
      stopResize();
      abortRef.current = new AbortController();
      resizingRef.current = true;
      startClientXRef.current = event.clientX;
      startWidthRef.current = widthRef.current;
      lastClientXRef.current = event.clientX;
      rawSidePanelWidthRef.current = widthRef.current;
      interactionStyleRef.current = {
        bodyCursor: document.body.style.cursor,
        htmlCursor: document.documentElement.style.cursor,
        userSelect: document.body.style.userSelect
      };

      setDocumentCursor('ew-resize');
      document.body.style.userSelect = 'none';
      setResizing(true);

      window.addEventListener('pointermove', scheduleResize, { signal: abortRef.current.signal });
      window.addEventListener('pointerup', finishResize, { signal: abortRef.current.signal });
      window.addEventListener('pointercancel', finishResize, { signal: abortRef.current.signal });
    },
    [clearSidePanelSettle, finishResize, scheduleResize, setDocumentCursor, stopResize]
  );

  useLayoutEffect(() => {
    applySidePanelWidth(preferredSidePanelWidthRef.current);
  }, [applySidePanelWidth]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const observer = new ResizeObserver(() => applySidePanelWidth(preferredSidePanelWidthRef.current));
    observer.observe(root);
    return () => observer.disconnect();
  }, [applySidePanelWidth]);

  useEffect(() => {
    if (!sidePanelVisible) {
      clearSidePanelSettle();
      setSettling(false);
      stopResize();
      applySidePanelWidth(preferredSidePanelWidthRef.current);
    }
  }, [applySidePanelWidth, clearSidePanelSettle, sidePanelVisible, stopResize]);

  useEffect(
    () => () => {
      clearSidePanelSettle();
      stopResize();
    },
    [clearSidePanelSettle, stopResize]
  );

  return (
    <div ref={rootRef} class="absolute inset-0 flex min-h-0 overflow-hidden">
      <div class="@container/chat relative min-w-0 flex-1">{children}</div>
      <AnimatePresence initial={false}>
        {sidePanelVisible && (
          <motion.aside
            key="side-panel"
            aria-label={sidePanelLabel}
            animate={sidePanelVisibleState}
            exit={sidePanelHiddenState}
            initial={sidePanelHiddenState}
            style={{ width: `var(--side-panel-width, ${storedInitialSidePanelWidth}px)` }}
            class={cn(
              'relative h-full min-h-0 shrink-0 transform-gpu overflow-hidden outline-0 [-webkit-app-region:no-drag]',
              settling && 'transition-[width] duration-150 ease-out'
            )}
          >
            <div
              aria-hidden="true"
              onPointerDown={startResize}
              class="group/side-panel-resize absolute inset-y-0 left-0 z-20 w-3 -translate-x-1/2 cursor-ew-resize touch-none select-none [-webkit-app-region:no-drag]"
            >
              <div
                class={cn(
                  'absolute inset-y-0 left-1/2 -translate-x-1/2 border-l border-composer opacity-0 transition-opacity duration-100 ease-out group-hover/side-panel-resize:opacity-100',
                  resizing && 'opacity-100'
                )}
              />
            </div>
            {sidePanel}
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
};
