import { tw } from '@renderer/utils/tw';
import type { JSX } from 'preact';
import { useState } from 'preact/hooks';

interface ResizeHandleProps {
  resizing: boolean;
  onPointerDown: (event: JSX.TargetedPointerEvent<HTMLDivElement>) => void;
}

export const ResizeHandle = ({ resizing, onPointerDown }: ResizeHandleProps) => {
  const [hovered, setHovered] = useState(false);
  const active = hovered || resizing;

  return (
    <div
      aria-hidden="true"
      onPointerDown={onPointerDown}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      class="absolute inset-y-0 left-0 z-20 w-3 -translate-x-1/2 touch-none select-none [cursor:var(--panel-resize-cursor,ew-resize)] [-webkit-app-region:no-drag]"
    >
      <div
        class={tw(
          'absolute inset-y-0 left-1/2 w-0 opacity-0 transition-opacity',
          active && 'border-l-2 border-ink/20 opacity-100 dark:border-l-[3px] dark:border-ink/35'
        )}
      />
    </div>
  );
};
