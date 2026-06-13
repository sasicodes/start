import { scrollToBottomButtonState } from '@renderer/shared/turn/scroll';
import type { RefObject } from 'preact';
import { useCallback, useEffect } from 'preact/hooks';

const hasPageBelow = (element: HTMLElement) =>
  element.scrollHeight - element.clientHeight - element.scrollTop > element.clientHeight;

const setVisible = (visible: boolean) => {
  if (scrollToBottomButtonState.value !== visible) scrollToBottomButtonState.value = visible;
};

export const useScrollToBottom = (scrollRef: RefObject<HTMLElement>, contentRef: RefObject<HTMLElement>) => {
  const sync = useCallback(() => {
    const element = scrollRef.current;
    setVisible(Boolean(element && hasPageBelow(element)));
  }, [scrollRef]);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    element.addEventListener('scroll', sync, { passive: true });
    sync();
    return () => element.removeEventListener('scroll', sync);
  }, [sync, scrollRef]);

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    const observer = new ResizeObserver(sync);
    observer.observe(content);
    return () => observer.disconnect();
  }, [sync, contentRef]);
};
