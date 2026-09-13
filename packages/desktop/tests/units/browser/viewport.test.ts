import { browserViewportMetrics } from '@main/browser/viewport';
import { describe, expect, it } from 'vitest';

describe('browserViewportMetrics', () => {
  it('keeps requested sizes and rounds them', () => {
    expect(browserViewportMetrics(390, 844)).toEqual({ width: 390, height: 844 });
    expect(browserViewportMetrics(1280.4)).toEqual({ width: 1280, height: 900 });
  });

  it('clamps sizes to a usable range', () => {
    expect(browserViewportMetrics(10, 10)).toEqual({ width: 240, height: 240 });
    expect(browserViewportMetrics(99999, 99999)).toEqual({ width: 4000, height: 4000 });
  });

  it('falls back to the default height for unusable values', () => {
    expect(browserViewportMetrics(768, Number.NaN)).toEqual({ width: 768, height: 900 });
    expect(browserViewportMetrics(768)).toEqual({ width: 768, height: 900 });
  });
});
