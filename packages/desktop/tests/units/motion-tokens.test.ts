import {
  bottomBubbleHiddenMotion,
  bottomBubbleHideTransition,
  bottomBubbleRevealTransition,
  bottomBubbleVisibleMotion,
  closeMotionTransition,
  composerDockTransition,
  openMotionTransition,
  quickLayoutTransition
} from '@renderer/ui/motion';
import { describe, expect, it } from 'vitest';

describe('motion tokens', () => {
  it('uses opacity only for the bottom bubble', () => {
    expect(bottomBubbleHiddenMotion).not.toHaveProperty('scale');
    expect(bottomBubbleVisibleMotion).not.toHaveProperty('scale');
    expect(bottomBubbleHiddenMotion).not.toHaveProperty('y');
    expect(bottomBubbleVisibleMotion).not.toHaveProperty('y');
    expect(bottomBubbleHiddenMotion).toHaveProperty('opacity');
    expect(bottomBubbleVisibleMotion).toHaveProperty('opacity');
  });

  it('keeps short close/open durations so popups feel snappy', () => {
    expect(closeMotionTransition.duration).toBeLessThanOrEqual(0.1);
    expect(openMotionTransition.duration).toBeLessThanOrEqual(0.15);
    expect(quickLayoutTransition.duration).toBeLessThanOrEqual(0.1);
    expect(composerDockTransition.duration).toBeLessThanOrEqual(0.15);
  });

  it('bottom-bubble reveal and hide stay under 150ms each', () => {
    expect(bottomBubbleRevealTransition.opacity.duration).toBeLessThanOrEqual(0.15);
    expect(bottomBubbleHideTransition.opacity.duration).toBeLessThanOrEqual(0.1);
  });
});
