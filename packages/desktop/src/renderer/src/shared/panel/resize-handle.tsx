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
      class="absolute inset-y-0 left-0 z-[100] w-3 -translate-x-1/2 touch-none select-none [cursor:var(--panel-resize-cursor,ew-resize)] [-webkit-app-region:no-drag]"
    >
      <div
        class={tw(
          'absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-gradient-to-b from-transparent via-ink/20 to-transparent opacity-0 transition-opacity dark:via-ink/35',
          active && 'opacity-100'
        )}
      />
    </div>
  );
};
