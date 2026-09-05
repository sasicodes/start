import { tw } from '@renderer/utils/tw';
import type { ComponentChildren } from 'preact';
import { useLayoutEffect, useRef } from 'preact/hooks';

interface MeasuredItemProps {
  itemKey: string;
  className: string;
  children: ComponentChildren;
  onHeight: (key: string, height: number) => void;
}

export const MeasuredItem = ({ itemKey, className, children, onHeight }: MeasuredItemProps) => {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    const measure = () => onHeight(itemKey, element.offsetHeight);
    const observer = new ResizeObserver(measure);
    measure();
    observer.observe(element);
    return () => observer.disconnect();
  }, [itemKey, onHeight]);

  return (
    <div ref={ref} class={tw('min-w-0', className)}>
      {children}
    </div>
  );
};
