import { ResizeHandle } from '@renderer/shared/side-panel/resize-handle';
import { closeMotionTransition, openMotionTransition } from '@renderer/ui/motion';
import { cn } from '@renderer/utils/cn';
import { AnimatePresence, motion } from 'motion/react';
import type { ComponentChildren, JSX } from 'preact';

type SidePanelFrameProps = {
  children: ComponentChildren;
  initialWidth: number;
  label: string;
  resizing: boolean;
  settling: boolean;
  visible: boolean;
  onResizePointerDown: (event: JSX.TargetedPointerEvent<HTMLDivElement>) => void;
};

const sidePanelHiddenState = { opacity: 0, transition: closeMotionTransition, x: '100%' };
const sidePanelVisibleState = { opacity: 1, transition: openMotionTransition, x: 0 };

export const SidePanelFrame = ({
  children,
  initialWidth,
  label,
  resizing,
  settling,
  visible,
  onResizePointerDown
}: SidePanelFrameProps) => (
  <AnimatePresence initial={false}>
    {visible && (
      <motion.aside
        key="side-panel"
        aria-label={label}
        animate={sidePanelVisibleState}
        exit={sidePanelHiddenState}
        initial={sidePanelHiddenState}
        style={{ width: `var(--side-panel-width, ${initialWidth}px)` }}
        class={cn(
          'relative h-full min-h-0 shrink-0 transform-gpu overflow-hidden outline-0 [-webkit-app-region:no-drag]',
          settling && 'transition-[width] duration-150 ease-out'
        )}
      >
        <div
          style={{ transform: 'translate3d(var(--side-panel-offset, 0px), 0, 0)' }}
          class={cn('absolute inset-0 transform-gpu', settling && 'transition-transform duration-150 ease-out')}
        >
          <ResizeHandle resizing={resizing} onPointerDown={onResizePointerDown} />
          {children}
        </div>
      </motion.aside>
    )}
  </AnimatePresence>
);
