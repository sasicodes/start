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

  it('classifies OpenAI by provider name', () => {
    expect(modelProviderId(model({ id: 'gpt-5.5', name: 'GPT 5.5', provider: 'openai' }))).toBe('openai');
  });

  it('classifies GPT models routed through openai-codex as openai', () => {
    expect(
      modelProviderId(model({ id: 'gpt-5.3-codex-spark', name: 'GPT 5.3 Codex Spark', provider: 'openai-codex' }))
    ).toBe('openai');
  });

  it('classifies unrecognized providers as custom', () => {
    expect(modelProviderId(model({ id: 'llama3.1:8b', name: 'Llama', provider: 'ollama' }))).toBe('custom');
    expect(modelProviderId(model({ id: 'mystery-1', name: 'Mystery', provider: 'somethingelse' }))).toBe('custom');
  });

  it('respects isCustom over any heuristic match', () => {
    expect(modelProviderId(model({ id: 'gpt-5.5', name: 'GPT 5.5', provider: 'pydantic', isCustom: true }))).toBe(
      'custom'
    );
    expect(
      modelProviderId(model({ id: 'claude-3-haiku', name: 'Claude Haiku', provider: 'my-proxy', isCustom: true }))
    ).toBe('custom');
  });
});
