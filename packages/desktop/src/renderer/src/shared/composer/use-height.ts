import { composerHeight } from '@renderer/shared/composer/state';
import { useCallback, useEffect, useRef } from 'preact/hooks';

export const useComposerHeight = (enabled: boolean) => {
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => () => cleanupRef.current?.(), []);

  return useCallback(
    (element: HTMLElement | null) => {
      cleanupRef.current?.();
      cleanupRef.current = null;

      if (!enabled || !element) {
        composerHeight.value = 0;
        return;
      }

      const sync = () => {
        composerHeight.value = Math.round(element.getBoundingClientRect().height);
      };
      sync();

      const observer = new ResizeObserver(sync);
      observer.observe(element);
      cleanupRef.current = () => {
        observer.disconnect();
        composerHeight.value = 0;
      };
    },
    [enabled]
  );
};
