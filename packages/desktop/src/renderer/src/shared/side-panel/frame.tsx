import { ResizeHandle } from '@renderer/shared/side-panel/resize-handle';
import { closeMotionTransition, openMotionTransition } from '@renderer/ui/motion';
import { tw } from '@renderer/utils/tw';
import { motion, AnimatePresence } from 'motion/react';
import type { JSX, ComponentChildren } from 'preact';

interface SidePanelFrameProps {
  children: ComponentChildren;
  initialWidth: number;
  label: string;
  resizing: boolean;
  settling: boolean;
  visible: boolean;
  onResizePointerDown: (event: JSX.TargetedPointerEvent<HTMLDivElement>) => void;
}

const sidePanelHiddenState = { opacity: 0, transition: closeMotionTransition, x: '100%' };
const sidePanelVisibleState = { opacity: 1, transition: openMotionTransition, x: 0 };

export const SidePanelFrame = ({
  label,
  visible,
  children,
  settling,
  resizing,
  initialWidth,
  onResizePointerDown
}: SidePanelFrameProps) => {
  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.aside
          key="side-panel"
          aria-label={label}
          animate={sidePanelVisibleState}
          exit={sidePanelHiddenState}
          initial={sidePanelHiddenState}
          style={{ width: `var(--side-panel-width, ${initialWidth}px)` }}
          class={tw(
            'relative h-full min-h-0 shrink-0 transform-gpu overflow-visible outline-0 [-webkit-app-region:no-drag]',
            settling && 'transition-[width] duration-150 ease-out'
          )}
        >
          <div
            style={{ transform: 'translate3d(var(--side-panel-offset, 0px), 0, 0)' }}
            class={tw(
              'absolute inset-0 transform-gpu shadow-[-10px_0_24px_-18px_oklch(0%_0_0_/_0.16)]',
              settling && 'transition-transform duration-150 ease-out'
            )}
          >
            <ResizeHandle resizing={resizing} onPointerDown={onResizePointerDown} />
            <div class="absolute inset-0 min-h-0 overflow-x-hidden overflow-y-auto outline-0 [&::-webkit-scrollbar]:hidden">
              {children}
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};
