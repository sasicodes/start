import {
  agentEndError,
  clampThinkingLevel,
  getLatestProviderModels,
  getSupportedEffortLevels,
  getVisibleModels,
  isProviderModel,
  modelKey,
  modelLabel,
  providerAuthKind,
  providerAuthLabel,
  providerAuthSlots,
  textDelta,
  thinkingDelta
} from '@main/helpers';
import type { AgentSessionEvent } from '@earendil-works/pi-coding-agent';
import { describe, expect, it } from 'vitest';

describe('helpers', () => {
  it('returns no effort levels for non-reasoning models', () => {
    expect(getSupportedEffortLevels({ reasoning: false })).toEqual([]);
  });

  it('clamps a requested level upward when unavailable, then falls back downward', () => {
    const model = { reasoning: true, thinkingLevelMap: { low: null, medium: 'med', high: 'hi' } };
    expect(clampThinkingLevel(model, 'low')).toBe('medium');
    expect(clampThinkingLevel(model, 'xhigh')).toBe('high');
  });

  it('maps providers to their auth.json slots, including the openai-codex subscription slot', () => {
    expect(providerAuthSlots('openai')).toEqual(['openai', 'openai-codex']);
    expect(providerAuthSlots('anthropic')).toEqual(['anthropic']);
    expect(providerAuthSlots('google')).toEqual(['google']);
  });

  it('labels provider auth based on connection signals', () => {
    expect(providerAuthKind(false, false, false)).toBe('none');
    expect(providerAuthKind(true, true, false)).toBe('subscription');
    expect(providerAuthKind(true, false, true)).toBe('api_key');
    expect(providerAuthLabel('subscription', true)).toBe('Connected via subscription');
    expect(providerAuthLabel('none', false)).toBe('Not connected');
  });

  it('classifies OpenAI, Anthropic, and Google models from identifiers', () => {
    expect(isProviderModel({ id: 'gpt-5.5', name: 'GPT 5.5', provider: 'openai' }, 'openai')).toBe(true);
    expect(
      isProviderModel({ id: 'claude-opus-4-7', name: 'Claude Opus 4 7', provider: 'anthropic' }, 'anthropic')
    ).toBe(true);
    expect(
      isProviderModel({ id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', provider: 'google' }, 'google')
    ).toBe(true);
    expect(isProviderModel({ id: 'gpt-5.5', name: 'GPT 5.5', provider: 'openai' }, 'anthropic')).toBe(false);
    expect(isProviderModel({ id: 'gpt-5.5', name: 'GPT 5.5', provider: 'openai' }, 'google')).toBe(false);
    expect(
      isProviderModel({ id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', provider: 'google' }, 'openai')
    ).toBe(false);
  });

  it('sorts the latest provider models into the configured display order', () => {
    const sorted = getLatestProviderModels('anthropic', [
      { id: 'claude-sonnet-4-6', name: 'Sonnet', provider: 'anthropic' },
      { id: 'claude-opus-4-7', name: 'Opus 4 7', provider: 'anthropic' },
      { id: 'claude-opus-4-6', name: 'Opus 4 6', provider: 'anthropic' }
    ]);
    expect(sorted.map((model) => model.id)).toEqual(['claude-opus-4-7', 'claude-opus-4-6', 'claude-sonnet-4-6']);
  });

  it('orders Google models smartest to cheapest', () => {
    const sorted = getLatestProviderModels('google', [
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'google' },
      { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', provider: 'google' },
      { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview', provider: 'google' }
    ]);
    expect(sorted.map((model) => model.id)).toEqual(['gemini-3.1-pro-preview', 'gemini-3.5-flash', 'gemini-2.5-pro']);
  });

  it('exposes labels and keys for models', () => {
    expect(modelKey({ id: 'claude-opus-4-7', provider: 'anthropic' })).toBe('anthropic:claude-opus-4-7');
    expect(modelLabel({ name: 'claude-opus-4-7', provider: 'anthropic' })).toBe('claude opus 4 7');
  });

  it('extracts text and thinking deltas from agent session events', () => {
    const textEvent: AgentSessionEvent = {
      type: 'message_update',
      assistantMessageEvent: { type: 'text_delta', delta: 'Hi' }
    } as AgentSessionEvent;
    const thinkingEvent: AgentSessionEvent = {
      type: 'message_update',
      assistantMessageEvent: { type: 'thinking_delta', delta: 'thinking' }
    } as AgentSessionEvent;

    expect(textDelta(textEvent)).toBe('Hi');
    expect(thinkingDelta(thinkingEvent)).toBe('thinking');
  });

  it('reports agent end errors when the last message has one', () => {
    const event: AgentSessionEvent = {
      type: 'agent_end',
      messages: [{ errorMessage: 'boom' }]
    } as AgentSessionEvent;
    expect(agentEndError(event)).toBe('boom');
  });

  it('keeps native allowlist models alongside registered custom-provider models', () => {
    const models = [
      { id: 'gpt-5.5', name: 'GPT 5.5', provider: 'openai' },
      { id: 'gpt-5.4', name: 'GPT 5.4', provider: 'openai' },
      { id: 'claude-opus-4-7', name: 'Claude Opus', provider: 'anthropic' },
      { id: 'llama3.1:8b', name: 'Llama 3.1 8B', provider: 'ollama-home' },
      { id: 'gpt-4', name: 'GPT 4', provider: 'pydantic-proxy' }
    ];
    const visible = getVisibleModels(models, new Set(['ollama-home', 'pydantic-proxy']));
    expect(visible.map((model) => model.id)).toEqual(['gpt-5.5', 'gpt-5.4', 'claude-opus-4-7', 'llama3.1:8b', 'gpt-4']);
  });

  it('drops non-registered provider models even when their ids look familiar', () => {
    const models = [
      { id: 'gpt-5.5', name: 'GPT 5.5', provider: 'openai' },
      { id: 'gpt-5', name: 'GPT 5', provider: 'openrouter' }
    ];
    const visible = getVisibleModels(models, new Set());
    expect(visible.map((model) => model.id)).toEqual(['gpt-5.5']);
  });

  it('returns the original list as a fallback when nothing matches', () => {
    const models = [{ id: 'mystery-1', name: 'Mystery', provider: 'unknown' }];
    expect(getVisibleModels(models, new Set())).toEqual(models);
  });
});
