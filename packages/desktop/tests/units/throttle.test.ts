import { createThrottle } from '@renderer/ui/throttle';
import { describe, expect, it } from 'vitest';

describe('createThrottle', () => {
  it('allows the first run for each name', () => {
    const throttled = createThrottle(400);
    expect(throttled('done', 1000)).toBe(false);
    expect(throttled('error', 1000)).toBe(false);
  });

  it('blocks repeats inside the interval', () => {
    const throttled = createThrottle(400);
    expect(throttled('done', 1000)).toBe(false);
    expect(throttled('done', 1399)).toBe(true);
  });

  it('allows a repeat after the interval passes', () => {
    const throttled = createThrottle(400);
    expect(throttled('done', 1000)).toBe(false);
    expect(throttled('done', 1400)).toBe(false);
  });

  it('tracks names independently', () => {
    const throttled = createThrottle(400);
    expect(throttled('done', 1000)).toBe(false);
    expect(throttled('attention', 1100)).toBe(false);
    expect(throttled('done', 1200)).toBe(true);
  });
});
