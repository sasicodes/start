import { computeTabReveal } from '@renderer/shared/settings/tab';
import { describe, expect, it } from 'vitest';

describe('computeTabReveal', () => {
  it('clips the space on both sides of the active tab', () => {
    expect(computeTabReveal(300, 100, 80)).toEqual({ left: 100, right: 120 });
  });

  it('clips only the right when the first tab is active', () => {
    expect(computeTabReveal(300, 0, 80)).toEqual({ left: 0, right: 220 });
  });

  it('clips only the left when the last tab is active', () => {
    expect(computeTabReveal(300, 220, 80)).toEqual({ left: 220, right: 0 });
  });
});
