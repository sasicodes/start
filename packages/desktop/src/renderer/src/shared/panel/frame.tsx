import { PanelMotionProvider } from '@renderer/shared/panel/context';
import { ResizeHandle } from '@renderer/shared/panel/resize-handle';
import { tw } from '@renderer/utils/tw';
import type { JSX, ComponentChildren } from 'preact';

interface PanelFrameProps {
  label: string;
  visible: boolean;
  resizing: boolean;
  settling: boolean;
  initialWidth: number;
  children: ComponentChildren;
  onResizePointerDown: (event: JSX.TargetedPointerEvent<HTMLDivElement>) => void;
}

export const PanelFrame = ({
  label,
  visible,
  children,
  settling,
  resizing,
  initialWidth,
  onResizePointerDown
}: PanelFrameProps) => {
  if (!visible) return null;

  const motion = { moving: resizing || settling };

  return (
    <aside
      aria-label={label}
      style={{ width: `var(--panel-width, ${initialWidth}px)` }}
      class={tw(
        'relative h-full min-h-0 shrink-0 transform-gpu overflow-visible outline-0 [-webkit-app-region:no-drag]',
        settling && 'transition-[width] duration-150 ease-out'
      )}
    >
      <div
        style={{ transform: 'translate3d(var(--panel-offset, 0px), 0, 0)' }}
        class={tw(
          'absolute inset-0 transform-gpu shadow-[-14px_0_40px_-16px_oklch(0%_0_0_/_0.12)] dark:shadow-[-14px_0_36px_-14px_oklch(0%_0_0_/_0.24)]',
          settling && 'transition-transform duration-150 ease-out'
        )}
      >
        <ResizeHandle resizing={resizing} onPointerDown={onResizePointerDown} />
        <div class="absolute inset-0 min-h-0 overflow-x-hidden overflow-y-auto outline-0 [&::-webkit-scrollbar]:hidden">
          <PanelMotionProvider value={motion}>{children}</PanelMotionProvider>
        </div>
      </div>
    </aside>
  );
};
