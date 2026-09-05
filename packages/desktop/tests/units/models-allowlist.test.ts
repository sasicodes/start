import { allowedLatestModelIds, allowedLatestModelOrder, models } from '@main/models';
import { describe, expect, it } from 'vitest';

describe('models allowlist', () => {
  it('exposes only the two supported providers', () => {
    const providers = new Set(models.map((model) => model.provider));
    expect(providers).toEqual(new Set(['anthropic', 'openai']));
  });

  it('returns a set for each provider with the right ids', () => {
    const anthropic = allowedLatestModelIds('anthropic');
    expect(anthropic.has('claude-fable-5')).toBe(true);
    expect(anthropic.has('claude-fable-5-1')).toBe(true);
    expect(anthropic.has('claude-opus-5')).toBe(true);
    expect(anthropic.has('claude-opus-4-8')).toBe(false);
    expect(anthropic.has('claude-sonnet-5')).toBe(true);
    expect(anthropic.has('claude-haiku-4-5')).toBe(false);

    const openai = allowedLatestModelIds('openai');
    expect(openai.has('gpt-6-astra')).toBe(true);
    expect(openai.has('gpt-5.5')).toBe(false);
  });

  it('preserves declaration order in allowedLatestModelOrder', () => {
    const order = allowedLatestModelOrder('openai');
    const declared = models.filter((model) => model.provider === 'openai').map((model) => model.id);
    expect(order).toEqual(declared);
  });

  it('never returns an empty set for a supported provider', () => {
    expect(allowedLatestModelIds('anthropic').size).toBeGreaterThan(0);
    expect(allowedLatestModelIds('openai').size).toBeGreaterThan(0);
  });
});
