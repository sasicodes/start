import { scrollToBottomButtonState } from '@renderer/shared/turn/scroll';
import type { RefObject } from 'preact';
import { useEffect } from 'preact/hooks';

export const hasContentBelow = (element: HTMLElement) =>
  element.scrollHeight - element.clientHeight - element.scrollTop > element.clientHeight;

export const observeScrollToBottom = (
  element: HTMLElement,
  content: HTMLElement,
  publish: (visible: boolean) => void
) => {
  let frame = 0;
  let timer = 0;
  let visible = false;

  const sync = () => {
    frame = 0;
    if (!hasContentBelow(element)) {
      window.clearTimeout(timer);
      timer = 0;
      if (visible) publish(false);
      visible = false;
      return;
    }
    if (visible || timer) return;

    timer = window.setTimeout(() => {
      timer = 0;
      if (!hasContentBelow(element)) return;
      visible = true;
      publish(true);
    }, 120);
  };
  const schedule = () => {
    if (!frame) frame = window.requestAnimationFrame(sync);
  };
  const observer = new ResizeObserver(schedule);
  observer.observe(element);
  observer.observe(content);
  element.addEventListener('scroll', schedule, { passive: true });
  publish(false);
  schedule();

  return () => {
    window.clearTimeout(timer);
    window.cancelAnimationFrame(frame);
    observer.disconnect();
    element.removeEventListener('scroll', schedule);
    publish(false);
  };
};

export const useScrollToBottom = (scrollRef: RefObject<HTMLElement>, contentRef: RefObject<HTMLElement>) => {
  useEffect(() => {
    const element = scrollRef.current;
    const content = contentRef.current;
    if (!element || !content) return;

    return observeScrollToBottom(element, content, (visible) => {
      scrollToBottomButtonState.value = visible;
    });
  }, [scrollRef, contentRef]);
};
