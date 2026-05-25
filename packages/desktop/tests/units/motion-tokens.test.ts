import { describe, expect, it } from 'vitest';
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

describe('motion tokens', () => {
  it('uses translate (y) and opacity for the bottom bubble — no scale', () => {
    expect(bottomBubbleHiddenMotion).not.toHaveProperty('scale');
    expect(bottomBubbleVisibleMotion).not.toHaveProperty('scale');
    expect(bottomBubbleHiddenMotion).toHaveProperty('y');
    expect(bottomBubbleVisibleMotion).toHaveProperty('y');
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
    expect(bottomBubbleRevealTransition.y.duration).toBeLessThanOrEqual(0.15);
    expect(bottomBubbleHideTransition.y.duration).toBeLessThanOrEqual(0.1);
  });
});
