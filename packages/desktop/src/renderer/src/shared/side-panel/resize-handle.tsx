import { cn } from '@renderer/utils/cn';
import type { JSX } from 'preact';

type ResizeHandleProps = {
  resizing: boolean;
  onPointerDown: (event: JSX.TargetedPointerEvent<HTMLDivElement>) => void;
};

export const ResizeHandle = ({ resizing, onPointerDown }: ResizeHandleProps) => (
  <div
    aria-hidden="true"
    onPointerDown={onPointerDown}
    class="group/side-panel-resize absolute inset-y-0 left-0 z-20 w-3 -translate-x-1/2 touch-none select-none [cursor:var(--side-panel-resize-cursor,ew-resize)] [-webkit-app-region:no-drag]"
  >
    <div
      class={cn(
        'absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 rounded-full bg-composer opacity-0 transition-opacity duration-100 ease-out group-hover/side-panel-resize:opacity-100',
        resizing && 'opacity-100'
      )}
    />
  </div>
);
