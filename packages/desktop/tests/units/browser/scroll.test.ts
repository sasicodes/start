import { browserScrollDelta } from '@main/browser/scroll';
import { describe, expect, it } from 'vitest';

describe('browserScrollDelta', () => {
  it('maps each direction to a signed axis delta', () => {
    expect(browserScrollDelta('up')).toEqual({ x: 0, y: -600 });
    expect(browserScrollDelta('down')).toEqual({ x: 0, y: 600 });
    expect(browserScrollDelta('left')).toEqual({ x: -600, y: 0 });
    expect(browserScrollDelta('right')).toEqual({ x: 600, y: 0 });
  });

  it('clamps and rounds the requested distance', () => {
    expect(browserScrollDelta('down', 12)).toEqual({ x: 0, y: 40 });
    expect(browserScrollDelta('down', 120.6)).toEqual({ x: 0, y: 121 });
    expect(browserScrollDelta('down', 99999)).toEqual({ x: 0, y: 4000 });
  });

  it('falls back to the default distance for unusable amounts', () => {
    expect(browserScrollDelta('down', 0)).toEqual({ x: 0, y: 600 });
    expect(browserScrollDelta('down', -50)).toEqual({ x: 0, y: 600 });
    expect(browserScrollDelta('down', Number.NaN)).toEqual({ x: 0, y: 600 });
    expect(browserScrollDelta('down')).toEqual({ x: 0, y: 600 });
  });
});
