import { closeMotionTransition, openMotionTransition } from '@renderer/ui/motion';
import { cn } from '@renderer/utils/cn';
import { AnimatePresence, motion } from 'motion/react';
import type { ComponentChildren, JSX } from 'preact';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';

type CursorValue = 'e-resize' | 'ew-resize' | 'w-resize';

type SideLayoutProps = {
  children: ComponentChildren;
  sidebar: ComponentChildren;
  sidebarLabel: string;
  sidebarVisible: boolean;
  defaultSidebarWidth?: number;
  maxSidebarWidth?: number;
  minSidebarWidth?: number;
  onSidebarCollapse?: () => void;
};

const defaultMinContentWidth = 320;
const defaultMinSidebarWidth = 320;
const defaultSidebarWidth = 480;
const maxSidebarWindowRatio = 0.6;
const sideLayoutSidebarWidthStorageKey = 'start-side-layout-sidebar-width';
const sidebarPanelHidden = { opacity: 0, transition: closeMotionTransition, x: '1rem' };
const sidebarPanelVisible = { opacity: 1, transition: openMotionTransition, x: 0 };

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const getResizeCursor = (startX: number, currentX: number): CursorValue => {
  if (currentX < startX) return 'w-resize';
  if (currentX > startX) return 'e-resize';
  return 'ew-resize';
};

const readStoredSidebarWidth = () => {
  try {
    const width = Number(window.localStorage.getItem(sideLayoutSidebarWidthStorageKey));
    return Number.isFinite(width) && width > 0 ? width : undefined;
  } catch {
    return undefined;
  }
};

const writeStoredSidebarWidth = (width: number) => {
  try {
    window.localStorage.setItem(sideLayoutSidebarWidthStorageKey, `${Math.round(width)}`);
  } catch {
    return;
  }
};

export const SideLayout = ({
  children,
  sidebar,
  sidebarLabel,
  sidebarVisible,
  onSidebarCollapse,
  maxSidebarWidth,
  minSidebarWidth = defaultMinSidebarWidth,
  defaultSidebarWidth: fallbackSidebarWidth = defaultSidebarWidth
}: SideLayoutProps) => {
  const [resizing, setResizing] = useState(false);
  const [storedInitialSidebarWidth] = useState(() => readStoredSidebarWidth() ?? fallbackSidebarWidth);
  const rootRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController>();
  const frameRef = useRef<number>();
  const lastClientXRef = useRef(0);
  const resizingRef = useRef(false);
  const startClientXRef = useRef(0);
  const startWidthRef = useRef(storedInitialSidebarWidth);
  const widthRef = useRef(storedInitialSidebarWidth);
  const preferredSidebarWidthRef = useRef(storedInitialSidebarWidth);
  const interactionStyleRef = useRef({ bodyCursor: '', htmlCursor: '', userSelect: '' });

  const getSidebarMaxWidth = useCallback(() => {
    const rootWidth = rootRef.current?.clientWidth ?? window.innerWidth;
    const maxContentWidth = rootWidth - defaultMinContentWidth;
    const maxWindowWidth = rootWidth * maxSidebarWindowRatio;
    const maxConfiguredWidth = maxSidebarWidth ?? Number.POSITIVE_INFINITY;
    return Math.max(minSidebarWidth, Math.min(maxConfiguredWidth, maxContentWidth, maxWindowWidth));
  }, [maxSidebarWidth, minSidebarWidth]);

  const applySidebarWidth = useCallback(
    (width: number, savePreference = false) => {
      const nextWidth = clamp(width, minSidebarWidth, getSidebarMaxWidth());
      widthRef.current = nextWidth;
      if (savePreference) preferredSidebarWidthRef.current = nextWidth;
      rootRef.current?.style.setProperty('--side-layout-sidebar-width', `${nextWidth}px`);
    },
    [getSidebarMaxWidth, minSidebarWidth]
  );

  const setDocumentCursor = useCallback((cursor: CursorValue) => {
    document.documentElement.style.cursor = cursor;
    document.body.style.cursor = cursor;
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

  const finishResize = useCallback(() => {
    writeStoredSidebarWidth(preferredSidebarWidthRef.current);
    stopResize();
  }, [stopResize]);

  const scheduleResize = useCallback(
    (event: PointerEvent) => {
      lastClientXRef.current = event.clientX;
      if (frameRef.current) return;

      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = undefined;

        const currentX = lastClientXRef.current;
        const nextWidth = startWidthRef.current + startClientXRef.current - currentX;
        setDocumentCursor(getResizeCursor(startClientXRef.current, currentX));

        if (nextWidth < minSidebarWidth) {
          stopResize();
          onSidebarCollapse?.();
          return;
        }

        applySidebarWidth(nextWidth, true);
      });
    },
    [applySidebarWidth, minSidebarWidth, onSidebarCollapse, setDocumentCursor, stopResize]
  );

  const startResize = useCallback(
    (event: JSX.TargetedPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;

      event.preventDefault();
      event.stopPropagation();

      stopResize();
      abortRef.current = new AbortController();
      resizingRef.current = true;
      startClientXRef.current = event.clientX;
      startWidthRef.current = widthRef.current;
      lastClientXRef.current = event.clientX;
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
    [finishResize, scheduleResize, setDocumentCursor, stopResize]
  );

  useLayoutEffect(() => {
    applySidebarWidth(preferredSidebarWidthRef.current);
  }, [applySidebarWidth]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const observer = new ResizeObserver(() => applySidebarWidth(preferredSidebarWidthRef.current));
    observer.observe(root);
    return () => observer.disconnect();
  }, [applySidebarWidth]);

  useEffect(() => {
    if (!sidebarVisible) stopResize();
  }, [sidebarVisible, stopResize]);

  useEffect(() => stopResize, [stopResize]);

  return (
    <div ref={rootRef} class="absolute inset-0 flex min-h-0 overflow-hidden">
      <div class="@container/chat relative min-w-0 flex-1">{children}</div>
      <AnimatePresence initial={false}>
        {sidebarVisible && (
          <motion.aside
            key="side-layout-sidebar"
            aria-label={sidebarLabel}
            animate={sidebarPanelVisible}
            exit={sidebarPanelHidden}
            initial={sidebarPanelHidden}
            style={{ width: `var(--side-layout-sidebar-width, ${storedInitialSidebarWidth}px)` }}
            class="relative h-full min-h-0 shrink-0 transform-gpu overflow-hidden outline-0 [-webkit-app-region:no-drag]"
          >
            <div
              aria-hidden="true"
              onPointerDown={startResize}
              class="group/side-resize absolute inset-y-0 left-0 z-20 w-3 -translate-x-1/2 cursor-ew-resize touch-none select-none [-webkit-app-region:no-drag]"
            >
              <div
                class={cn(
                  'absolute inset-y-0 left-1/2 -translate-x-1/2 border-l border-line opacity-0 transition-opacity duration-100 ease-out group-hover/side-resize:opacity-100',
                  resizing && 'opacity-100'
                )}
              />
            </div>
            {sidebar}
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
};
