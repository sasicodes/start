import type { Transition } from 'motion/react';

export const bottomBubbleHiddenMotion = { opacity: 0, y: 8 } as const;
export const bottomBubbleVisibleMotion = { opacity: 1, y: 0 } as const;
export const bottomBubbleHideTransition = {
  y: { duration: 0.08, ease: 'easeOut' },
  opacity: { duration: 0.06, ease: 'easeOut' }
} as const satisfies Transition;
export const bottomBubbleRevealTransition = {
  y: { duration: 0.12, ease: [0.22, 1, 0.36, 1] },
  opacity: { duration: 0.08, ease: 'easeOut' }
} as const satisfies Transition;
export const closeMotionTransition = { duration: 0.06, ease: 'easeOut' } as const satisfies Transition;
export const composerDockTransition = { duration: 0.12, ease: [0.22, 1, 0.36, 1] } as const satisfies Transition;
export const openMotionTransition = { duration: 0.12, ease: [0.22, 1, 0.36, 1] } as const satisfies Transition;
export const quickLayoutTransition = { duration: 0.08, ease: [0.22, 1, 0.36, 1] } as const satisfies Transition;
