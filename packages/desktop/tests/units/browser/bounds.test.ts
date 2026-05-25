import { browserBoundsEqual, readBrowserBounds } from '@renderer/shared/browser/bounds';
import { describe, expect, it } from 'vitest';

describe('browser bounds', () => {
  it('rounds viewport bounds for the native browser view', () => {
    const element = {
      getBoundingClientRect: () => ({ left: 12.4, top: 4.6, width: 320.5, height: 240.2 })
    } as HTMLElement;

    expect(readBrowserBounds(element)).toEqual({ x: 12, y: 5, width: 321, height: 240 });
  });

  it('compares bounds before sending resize updates', () => {
    const bounds = { x: 1, y: 2, width: 3, height: 4 };

    expect(browserBoundsEqual(bounds, { ...bounds })).toBe(true);
    expect(browserBoundsEqual(bounds, { ...bounds, width: 5 })).toBe(false);
    expect(browserBoundsEqual(null, bounds)).toBe(false);
  });
});
