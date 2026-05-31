import type { BrowserBounds } from '@preload/index';
import { browserBoundsEqual, readBrowserBounds } from '@renderer/shared/browser/bounds';
import type { RefObject } from 'preact';
import { useCallback, useEffect, useRef } from 'preact/hooks';

interface BrowserBoundsInput {
  active: boolean;
  moving: boolean;
  viewportRef: RefObject<HTMLDivElement>;
}

export const useBrowserBounds = ({ active, moving, viewportRef }: BrowserBoundsInput) => {
  const frameRef = useRef<number>(0);
  const lastBoundsRef = useRef<BrowserBounds | null>(null);

  const clearBounds = useCallback(() => {
    lastBoundsRef.current = null;
    window.pi.app.browserBounds(null).catch(() => {});
  }, []);

  const syncBounds = useCallback(async () => {
    const element = viewportRef.current;
    if (!element) {
      clearBounds();
      return;
    }

    const bounds = readBrowserBounds(element);
    if (browserBoundsEqual(lastBoundsRef.current, bounds)) return;

    lastBoundsRef.current = bounds;
    await window.pi.app.browserBounds(bounds).catch(() => {});
  }, [clearBounds, viewportRef]);

  const sendBounds = useCallback(() => {
    void syncBounds();
  }, [syncBounds]);

  const scheduleBounds = useCallback(() => {
    if (frameRef.current) return;

    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = 0;
      sendBounds();
    });
  }, [sendBounds]);

  useEffect(() => {
    if (!active) {
      clearBounds();
      return;
    }

    const element = viewportRef.current;
    if (!element) return;

    scheduleBounds();
    const resizeObserver = new ResizeObserver(scheduleBounds);
    const viewport = window.visualViewport;
    let pixelRatioMedia: MediaQueryList | null = null;
    const bindPixelRatioListener = () => {
      pixelRatioMedia?.removeEventListener('change', handlePixelRatioChange);
      pixelRatioMedia = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      pixelRatioMedia.addEventListener('change', handlePixelRatioChange);
    };
    const handlePixelRatioChange = () => {
      lastBoundsRef.current = null;
      scheduleBounds();
      bindPixelRatioListener();
    };

    bindPixelRatioListener();
    resizeObserver.observe(element);
    window.addEventListener('resize', scheduleBounds);
    viewport?.addEventListener('resize', scheduleBounds, { passive: true });
    viewport?.addEventListener('scroll', scheduleBounds, { passive: true });
    return () => {
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = 0;
      }

      clearBounds();
      resizeObserver.disconnect();
      window.removeEventListener('resize', scheduleBounds);
      viewport?.removeEventListener('resize', scheduleBounds);
      viewport?.removeEventListener('scroll', scheduleBounds);
      pixelRatioMedia?.removeEventListener('change', handlePixelRatioChange);
    };
  }, [active, clearBounds, scheduleBounds, viewportRef]);

  useEffect(() => {
    if (!active || !moving) return;

    let frame = 0;
    const trackBounds = () => {
      sendBounds();
      frame = window.requestAnimationFrame(trackBounds);
    };

    trackBounds();
    return () => {
      window.cancelAnimationFrame(frame);
      sendBounds();
    };
  }, [active, moving, sendBounds]);

  return syncBounds;
};
