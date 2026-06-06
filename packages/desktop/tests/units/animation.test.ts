import { animationActive } from '@renderer/shared/animation';

describe('animation', () => {
  it('runs only when focused and active', () => {
    expect(animationActive(true)).toBe(true);
    expect(animationActive(false)).toBe(false);
    expect(animationActive(true, false)).toBe(false);
    expect(animationActive(false, true)).toBe(false);
  });
});
