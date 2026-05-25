import { ResizeHandle } from '@renderer/shared/side-panel/resize-handle';
import { tw } from '@renderer/utils/tw';
import type { JSX, ComponentChildren } from 'preact';

interface SidePanelFrameProps {
  label: string;
  visible: boolean;
  resizing: boolean;
  settling: boolean;
  initialWidth: number;
  children: ComponentChildren;
  onResizePointerDown: (event: JSX.TargetedPointerEvent<HTMLDivElement>) => void;
}

export const SidePanelFrame = ({
  label,
  visible,
  children,
  settling,
  resizing,
  initialWidth,
  onResizePointerDown
}: SidePanelFrameProps) => {
  if (!visible) return null;

  return (
    <aside
      aria-label={label}
      style={{ width: `var(--side-panel-width, ${initialWidth}px)` }}
      class={tw(
        'relative h-full min-h-0 shrink-0 transform-gpu overflow-visible outline-0 [-webkit-app-region:no-drag]',
        settling && 'transition-[width] duration-150 ease-out'
      )}
    >
      <div
        style={{ transform: 'translate3d(var(--side-panel-offset, 0px), 0, 0)' }}
        class={tw(
          'absolute inset-0 transform-gpu shadow-[-10px_0_24px_-18px_oklch(0%_0_0_/_0.16)] dark:shadow-[-10px_0_22px_-16px_oklch(0%_0_0_/_0.3)]',
          settling && 'transition-transform duration-150 ease-out'
        )}
      >
        <ResizeHandle resizing={resizing} onPointerDown={onResizePointerDown} />
        <div class="absolute inset-0 min-h-0 overflow-x-hidden overflow-y-auto outline-0 [&::-webkit-scrollbar]:hidden">
          {children}
        </div>
      </div>
    </aside>
  );
};
