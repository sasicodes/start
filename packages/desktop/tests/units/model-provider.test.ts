import { modelProviderId } from '@renderer/shared/models/provider';
import type { ModelOption } from '@preload/index';
import { describe, expect, it } from 'vitest';

const model = (overrides: Partial<ModelOption>): ModelOption => ({
  id: '',
  key: '',
  name: '',
  provider: '',
  reasoning: false,
  contextWindow: 0,
  effortLevels: [],
  input: ['text'],
  ...overrides
});

describe('modelProviderId', () => {
  it('classifies Anthropic by provider name', () => {
    expect(modelProviderId(model({ id: 'claude-opus-4-7', name: 'Claude Opus', provider: 'anthropic' }))).toBe(
      'anthropic'
    );
  });

  it('classifies Anthropic by claude in identifiers', () => {
    expect(modelProviderId(model({ id: 'claude-haiku-4-5', name: 'haiku', provider: 'openrouter' }))).toBe('anthropic');
  });

  it('classifies Google by provider name', () => {
    expect(modelProviderId(model({ id: 'gemini-3.1-pro-preview', name: 'Gemini Pro', provider: 'google' }))).toBe(
      'google'
    );
  });

  it('classifies Google by gemini in identifiers', () => {
    expect(modelProviderId(model({ id: 'gemini-3.5-flash', name: 'flash', provider: 'unknown' }))).toBe('google');
  });

  it('classifies OpenAI as the default', () => {
    expect(modelProviderId(model({ id: 'gpt-5.5', name: 'GPT 5.5', provider: 'openai' }))).toBe('openai');
  });

  it('falls back to OpenAI for unrecognized providers', () => {
    expect(modelProviderId(model({ id: 'mystery-1', name: 'Mystery', provider: 'somethingelse' }))).toBe('openai');
  });
});
