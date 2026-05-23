import type { Transition } from 'motion/react';

export const attachedPanelHiddenMotion = { opacity: 0, scale: 0.985, y: 6 } as const;
export const attachedPanelVisibleMotion = { opacity: 1, scale: 1, y: 0 } as const;
export const bottomBubbleHiddenMotion = { opacity: 0, scale: 0.98 } as const;
export const bottomBubbleVisibleMotion = { opacity: 1, scale: 1 } as const;
export const attachedPanelTransition = {
  y: { type: 'spring', duration: 0.2, bounce: 0.24 },
  scale: { type: 'spring', duration: 0.2, bounce: 0.18 },
  opacity: { duration: 0.07, ease: 'easeOut' }
} as const satisfies Transition;
export const bottomBubbleHideTransition = {
  scale: { duration: 0.1, ease: [0.22, 1, 0.36, 1] },
  opacity: { duration: 0.08, delay: 0.02, ease: 'easeOut' }
} as const satisfies Transition;
export const bottomBubbleRevealTransition = {
  scale: { type: 'spring', duration: 0.2, bounce: 0.16 },
  opacity: { duration: 0.08, ease: 'easeOut' }
} as const satisfies Transition;
export const closeMotionTransition = { duration: 0.08, ease: 'easeOut' } as const satisfies Transition;
export const composerDockTransition = { type: 'spring', duration: 0.32, bounce: 0.12 } as const satisfies Transition;
export const openMotionTransition = { duration: 0.18, ease: [0.22, 1, 0.36, 1] } as const satisfies Transition;
export const quickLayoutTransition = { duration: 0.1, ease: [0.22, 1, 0.36, 1] } as const satisfies Transition;
