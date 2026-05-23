import type { Transition } from 'motion/react';

export const attachedPanelHiddenMotion = { scaleX: 0.99, scaleY: 0.9 } as const;
export const attachedPanelVisibleMotion = { scaleX: 1, scaleY: 1 } as const;
export const bottomBubbleHiddenMotion = { opacity: 0, scale: 0.98 } as const;
export const bottomBubbleVisibleMotion = { opacity: 1, scale: 1 } as const;
export const attachedPanelTransition = {
  scaleX: { type: 'spring', duration: 0.16, bounce: 0.18 },
  scaleY: { type: 'spring', duration: 0.18, bounce: 0.34 }
} as const satisfies Transition;
export const bottomBubbleHideTransition = {
  scale: { duration: 0.1, ease: [0.22, 1, 0.36, 1] },
  opacity: { duration: 0.08, delay: 0.02, ease: 'easeOut' }
} as const satisfies Transition;
export const bottomBubbleRevealTransition = {
  scale: { type: 'spring', duration: 0.18, bounce: 0.14 },
  opacity: { duration: 0.08, ease: 'easeOut' }
} as const satisfies Transition;
export const closeMotionTransition = { duration: 0.08, ease: 'easeOut' } as const satisfies Transition;
export const composerDockTransition = { type: 'spring', duration: 0.24, bounce: 0.1 } as const satisfies Transition;
export const openMotionTransition = { duration: 0.18, ease: [0.22, 1, 0.36, 1] } as const satisfies Transition;
export const quickLayoutTransition = { duration: 0.1, ease: [0.22, 1, 0.36, 1] } as const satisfies Transition;
