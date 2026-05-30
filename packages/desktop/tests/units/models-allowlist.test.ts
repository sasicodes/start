import { describe, expect, it } from 'vitest';
import { allowedLatestModelIds, allowedLatestModelOrder, models } from '@main/models';

describe('models allowlist', () => {
  it('exposes only the three supported providers', () => {
    const providers = new Set(models.map((model) => model.provider));
    expect(providers).toEqual(new Set(['anthropic', 'google', 'openai']));
  });

  it('returns a set for each provider with the right ids', () => {
    const anthropic = allowedLatestModelIds('anthropic');
    expect(anthropic.has('claude-opus-4-8')).toBe(true);
    expect(anthropic.has('claude-sonnet-4-6')).toBe(true);

    const openai = allowedLatestModelIds('openai');
    expect(openai.has('gpt-5.5')).toBe(true);

    const google = allowedLatestModelIds('google');
    expect(google.has('gemini-3.5-flash')).toBe(true);
  });

  it('preserves declaration order in allowedLatestModelOrder', () => {
    const order = allowedLatestModelOrder('openai');
    const declared = models.filter((model) => model.provider === 'openai').map((model) => model.id);
    expect(order).toEqual(declared);
  });

  it('never returns an empty set for a supported provider', () => {
    expect(allowedLatestModelIds('anthropic').size).toBeGreaterThan(0);
    expect(allowedLatestModelIds('openai').size).toBeGreaterThan(0);
    expect(allowedLatestModelIds('google').size).toBeGreaterThan(0);
  });
});
