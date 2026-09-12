import { composerClearance } from '@renderer/shared/composer/state';
import type { RefObject } from 'preact';
import { useLayoutEffect } from 'preact/hooks';

export const useTurnClearance = (ref: RefObject<HTMLElement>) => {
  const clearance = composerClearance.value;

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    const atBottom = element.scrollHeight - element.clientHeight - element.scrollTop <= 2;
    element.style.paddingBottom = `${clearance}px`;
    if (atBottom) element.scrollTop = element.scrollHeight;
  }, [ref, clearance]);
};
