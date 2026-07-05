import { animationActive, flyoutRisePx } from '@renderer/shared/animation';

describe('animation', () => {
  it('runs only when focused and active', () => {
    expect(animationActive(true)).toBe(true);
    expect(animationActive(false)).toBe(false);
    expect(animationActive(true, false)).toBe(false);
    expect(animationActive(false, true)).toBe(false);
  });

  it('raises the flyout by the rows below the active row', () => {
    expect(flyoutRisePx(3, 0, 36)).toBe(72);
    expect(flyoutRisePx(3, 1, 36)).toBe(36);
    expect(flyoutRisePx(3, 2, 36)).toBe(0);
  });
});
