import type { Usage } from '@earendil-works/pi-ai';
import { describe, expect, it } from 'vitest';
import { contextPercent } from '@main/chat/context';

const usage = (input: number, cacheRead = 0, cacheWrite = 0): Usage => ({
  input,
  output: 0,
  cacheRead,
  cacheWrite,
  totalTokens: input + cacheRead + cacheWrite,
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 }
});

describe('contextPercent', () => {
  it('sums input, cacheRead, and cacheWrite against the context window', () => {
    expect(contextPercent(usage(50_000, 30_000, 20_000), 200_000)).toBe(50);
  });

  it('returns 0 when usage is missing', () => {
    expect(contextPercent(undefined, 200_000)).toBe(0);
  });

  it('returns 0 when contextWindow is not positive', () => {
    expect(contextPercent(usage(1000), 0)).toBe(0);
    expect(contextPercent(usage(1000), -1)).toBe(0);
  });

  it('clamps overflows to 100', () => {
    expect(contextPercent(usage(500_000), 200_000)).toBe(100);
  });

  it('returns 0 when no input tokens are consumed', () => {
    expect(contextPercent(usage(0), 200_000)).toBe(0);
  });

  it('excludes output tokens from the fallback when totalTokens is absent', () => {
    const noTotal: Usage = {
      input: 100_000,
      output: 100_000,
      cacheRead: 0,
      cacheWrite: 0,
      totalTokens: 0,
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 }
    };
    expect(contextPercent(noTotal, 200_000)).toBe(50);
  });
});
