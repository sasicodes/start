import type { Transition } from 'motion/react';

export const closeMotionTransition = { duration: 0.08, ease: 'easeOut' } as const satisfies Transition;
export const openMotionTransition = { duration: 0.18, ease: [0.22, 1, 0.36, 1] } as const satisfies Transition;
export const quickLayoutTransition = { duration: 0.1, ease: [0.22, 1, 0.36, 1] } as const satisfies Transition;
