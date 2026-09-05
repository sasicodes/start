import { tw } from '@renderer/utils/tw';
import type { ComponentChildren } from 'preact';
import { useLayoutEffect, useRef } from 'preact/hooks';

interface MeasuredItemProps {
  itemKey: string;
  className: string;
  children: ComponentChildren;
  onHeight: (key: string, height: number) => void;
}

export const observeHeight = (element: HTMLElement, onHeight: (height: number) => void) => {
  let frame = 0;
  let active = true;
  const measure = () => onHeight(element.offsetHeight);
  const observer = new ResizeObserver(() => {
    if (!active || frame) return;
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      measure();
    });
  });
  measure();
  observer.observe(element);
  return () => {
    active = false;
    observer.disconnect();
    window.cancelAnimationFrame(frame);
  };
};

export const MeasuredItem = ({ itemKey, className, children, onHeight }: MeasuredItemProps) => {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    return observeHeight(element, (height) => onHeight(itemKey, height));
  }, [itemKey, onHeight]);

  return (
    <div ref={ref} class={tw('min-w-0', className)}>
      {children}
    </div>
  );
};
