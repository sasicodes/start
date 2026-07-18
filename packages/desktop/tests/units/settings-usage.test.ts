import { usageLabel } from '@renderer/shared/settings/usage';

describe('provider usage labels', () => {
  const now = 2_000_000_000_000;

  it('formats short reset delays compactly', () => {
    expect(usageLabel({ id: 'openai', remainingPercent: 93, resetAt: now + 5 * 3_600_000 }, now)).toBe(
      '93% remaining / resets in 5h'
    );
  });

  it('formats long and elapsed reset delays', () => {
    expect(usageLabel({ id: 'anthropic', remainingPercent: 99, resetAt: now + 3 * 86_400_000 }, now)).toBe(
      '99% remaining / resets in 3d'
    );
    expect(usageLabel({ id: 'anthropic', remainingPercent: 99, resetAt: now }, now)).toBe(
      '99% remaining / resets soon'
    );
  });
});
