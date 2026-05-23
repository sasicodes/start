import type { RefObject } from 'preact';
import { useLayoutEffect } from 'preact/hooks';

interface UseComposerHeightVariableOptions {
  enabled: boolean;
  ref: RefObject<HTMLElement>;
}

export const useComposerHeightVariable = ({ ref, enabled }: UseComposerHeightVariableOptions) => {
  useLayoutEffect(() => {
    if (!enabled) return;

    const element = ref.current;
    if (!element) return;

    const syncHeight = () => {
      document.documentElement.style.setProperty('--main-composer-height', `${Math.ceil(element.offsetHeight)}px`);
    };
    const observer = new ResizeObserver(syncHeight);
    syncHeight();
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, enabled]);
};
