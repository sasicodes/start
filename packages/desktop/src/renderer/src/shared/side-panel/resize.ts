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
import type { JSX } from 'preact';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';

type UseSidePanelResizeOptions = {
  fallbackWidth: number;
  maxSidePanelWidth?: number;
  minSidePanelWidth: number;
  sidePanelVisible: boolean;
  onSidePanelCollapse?: () => void;
};

const defaultMinContentWidth = 320;

export const useSidePanelResize = ({
  fallbackWidth,
  maxSidePanelWidth,
  minSidePanelWidth,
  onSidePanelCollapse,
  sidePanelVisible
}: UseSidePanelResizeOptions) => {
  const [resizing, setResizing] = useState(false);
  const [settling, setSettling] = useState(false);
  const [initialWidth] = useState(() => readStoredSidePanelWidth() ?? fallbackWidth);
  const rootRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController>();
  const frameRef = useRef<number>();
  const lastClientXRef = useRef(0);
  const rawWidthRef = useRef(initialWidth);
  const resizingRef = useRef(false);
  const settleFrameRef = useRef<number>();
  const settleTimeoutRef = useRef<number>();
  const startClientXRef = useRef(0);
  const startWidthRef = useRef(initialWidth);
  const widthRef = useRef(initialWidth);
  const preferredWidthRef = useRef(initialWidth);
  const interactionStyleRef = useRef({ bodyCursor: '', htmlCursor: '', userSelect: '' });

  const getMaxWidth = useCallback(() => {
    const rootWidth = rootRef.current?.clientWidth ?? window.innerWidth;
    const maxContentWidth = rootWidth - defaultMinContentWidth;
    const maxWindowWidth = rootWidth * maxSidePanelWindowRatio;
    const maxConfiguredWidth = maxSidePanelWidth ?? Number.POSITIVE_INFINITY;
    return Math.max(minSidePanelWidth, Math.min(maxConfiguredWidth, maxContentWidth, maxWindowWidth));
  }, [maxSidePanelWidth, minSidePanelWidth]);

  const setOffset = useCallback((offset: number) => {
    rootRef.current?.style.setProperty('--side-panel-offset', `${offset}px`);
  }, []);

  const setWidth = useCallback((width: number) => {
    widthRef.current = width;
    rootRef.current?.style.setProperty('--side-panel-width', `${width}px`);
  }, []);

  const setResizeCursor = useCallback(
    (width: number) => {
      const cursor = getResizeCursor({
        width,
        minWidth: minSidePanelWidth,
        maxWidth: getMaxWidth(),
        canCollapse: Boolean(onSidePanelCollapse)
      });
      rootRef.current?.style.setProperty('--side-panel-resize-cursor', cursor);
      return cursor;
    },
    [getMaxWidth, minSidePanelWidth, onSidePanelCollapse]
  );

  const applyWidth = useCallback(
    (width: number, savePreference = false) => {
      const nextWidth = clamp(width, minSidePanelWidth, getMaxWidth());
      setWidth(nextWidth);
      setResizeCursor(nextWidth);
      if (savePreference) preferredWidthRef.current = nextWidth;
    },
    [getMaxWidth, minSidePanelWidth, setResizeCursor, setWidth]
  );

  const applyDragWidth = useCallback(
    (width: number) => {
      const cursor = setResizeCursor(width);

      if (width < minSidePanelWidth) {
        setWidth(minSidePanelWidth);
        setOffset(Math.min(minSidePanelWidth, minSidePanelWidth - width));
        return cursor;
      }

      setOffset(0);
      applyWidth(width, true);
      return cursor;
    },
    [applyWidth, minSidePanelWidth, setOffset, setResizeCursor, setWidth]
  );

  const setDocumentCursor = useCallback((cursor: ResizeCursor) => {
    document.documentElement.style.cursor = cursor;
    document.body.style.cursor = cursor;
  }, []);

  const clearSettle = useCallback(() => {
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

  const settleWidth = useCallback(
    (width: number) => {
      clearSettle();
      setSettling(true);
      stopResize();

      settleFrameRef.current = requestAnimationFrame(() => {
        settleFrameRef.current = undefined;
        setOffset(0);
        applyWidth(width, true);
        settleTimeoutRef.current = window.setTimeout(() => {
          settleTimeoutRef.current = undefined;
          setSettling(false);
        }, sidePanelSettleDurationMs);
      });
    },
    [applyWidth, clearSettle, setOffset, stopResize]
  );

  const collapse = useCallback(() => {
    clearSettle();
    setSettling(true);
    stopResize();

    settleFrameRef.current = requestAnimationFrame(() => {
      settleFrameRef.current = undefined;
      setWidth(minSidePanelWidth);
      setOffset(minSidePanelWidth);
      settleTimeoutRef.current = window.setTimeout(() => {
        settleTimeoutRef.current = undefined;
        onSidePanelCollapse?.();
        setSettling(false);
      }, sidePanelSettleDurationMs);
    });
  }, [clearSettle, minSidePanelWidth, onSidePanelCollapse, setOffset, setWidth, stopResize]);

  const finishResize = useCallback(() => {
    const rawWidth = rawWidthRef.current;
    const nextWidth = rawWidth < minSidePanelWidth ? minSidePanelWidth : preferredWidthRef.current;

    if (rawWidth <= getSidePanelCollapseWidth(minSidePanelWidth)) {
      collapse();
      return;
    }

    writeStoredSidePanelWidth(nextWidth);

    if (rawWidth < minSidePanelWidth) {
      preferredWidthRef.current = nextWidth;
      settleWidth(nextWidth);
      return;
    }

    stopResize();
  }, [collapse, minSidePanelWidth, settleWidth, stopResize]);

  const scheduleResize = useCallback(
    (event: PointerEvent) => {
      lastClientXRef.current = event.clientX;
      if (frameRef.current) return;

      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = undefined;

        const currentX = lastClientXRef.current;
        const nextWidth = startWidthRef.current + startClientXRef.current - currentX;
        rawWidthRef.current = nextWidth;
        setDocumentCursor(applyDragWidth(nextWidth));
      });
    },
    [applyDragWidth, setDocumentCursor]
  );

  const startResize = useCallback(
    (event: JSX.TargetedPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;

      event.preventDefault();
      event.stopPropagation();

      clearSettle();
      setSettling(false);
      stopResize();
      abortRef.current = new AbortController();
      resizingRef.current = true;
      startClientXRef.current = event.clientX;
      startWidthRef.current = widthRef.current;
      lastClientXRef.current = event.clientX;
      rawWidthRef.current = widthRef.current;
      interactionStyleRef.current = {
        bodyCursor: document.body.style.cursor,
        htmlCursor: document.documentElement.style.cursor,
        userSelect: document.body.style.userSelect
      };

      setDocumentCursor(setResizeCursor(widthRef.current));
      document.body.style.userSelect = 'none';
      setResizing(true);

      window.addEventListener('pointermove', scheduleResize, { signal: abortRef.current.signal });
      window.addEventListener('pointerup', finishResize, { signal: abortRef.current.signal });
      window.addEventListener('pointercancel', finishResize, { signal: abortRef.current.signal });
    },
    [clearSettle, finishResize, scheduleResize, setDocumentCursor, setResizeCursor, stopResize]
  );

  useLayoutEffect(() => {
    if (!sidePanelVisible) return;

    setOffset(0);
    applyWidth(preferredWidthRef.current);
  }, [applyWidth, setOffset, sidePanelVisible]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const observer = new ResizeObserver(() => applyWidth(preferredWidthRef.current));
    observer.observe(root);
    return () => observer.disconnect();
  }, [applyWidth]);

  useEffect(() => {
    if (!sidePanelVisible) {
      clearSettle();
      setSettling(false);
      stopResize();
    }
  }, [clearSettle, sidePanelVisible, stopResize]);

  useEffect(
    () => () => {
      clearSettle();
      stopResize();
    },
    [clearSettle, stopResize]
  );

  return { initialWidth, resizing, rootRef, settling, startResize };
};
