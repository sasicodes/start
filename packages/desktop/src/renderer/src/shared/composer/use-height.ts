import { composerHeight } from '@renderer/shared/composer/state';
import type { RefObject } from 'preact';
import { useEffect } from 'preact/hooks';

export const useComposerHeight = (ref: RefObject<HTMLElement>, enabled: boolean) => {
  useEffect(() => {
    const element = ref.current;
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
    return () => {
      observer.disconnect();
      composerHeight.value = 0;
    };
  }, [ref, enabled]);
};
