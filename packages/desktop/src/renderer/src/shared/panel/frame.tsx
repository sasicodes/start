import { PanelMotionProvider } from '@renderer/shared/panel/context';
import { ResizeHandle } from '@renderer/shared/panel/resize-handle';
import { tw } from '@renderer/utils/tw';
import type { ComponentChildren, JSX } from 'preact';

interface PanelFrameProps {
  label: string;
  visible: boolean;
  resizing: boolean;
  settling: boolean;
  resizable: boolean;
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
  resizable,
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
        'relative z-60 h-full min-h-0 shrink-0 transform-gpu overflow-visible outline-0 [-webkit-app-region:no-drag]',
        settling && 'transition-[width] ease-out'
      )}
    >
      <div
        style={{ transform: 'translate3d(var(--panel-offset, 0px), 0, 0)' }}
        class={tw('absolute inset-0 transform-gpu border-l border-line', settling && 'transition-transform ease-out')}
      >
        {resizable && <ResizeHandle resizing={resizing} onPointerDown={onResizePointerDown} />}
        <div class="absolute inset-0 min-h-0 overflow-x-hidden overflow-y-auto outline-0 [&::-webkit-scrollbar]:hidden">
          <PanelMotionProvider value={motion}>{children}</PanelMotionProvider>
        </div>
      </div>
    </aside>
  );
};
