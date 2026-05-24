import type { AgentSessionEvent } from '@earendil-works/pi-coding-agent';
import {
  effortLevels,
  type EffortLevel,
  type ProviderKey,
  type ThinkingModel,
  type ProviderAuthKind
} from '@main/types';

export const getSupportedEffortLevels = (model: ThinkingModel): EffortLevel[] => {
  if (!model.reasoning) return [];
  return effortLevels.filter((level) => {
    const mappedLevel = model.thinkingLevelMap?.[level];
    if (mappedLevel === null) return false;
    if (level === 'xhigh') return mappedLevel !== undefined;
    return true;
  });
};

export const clampThinkingLevel = (model: ThinkingModel, level: EffortLevel): EffortLevel => {
  const availableLevels = getSupportedEffortLevels(model);
  if (availableLevels.includes(level)) return level;

  const requestedIndex = effortLevels.indexOf(level);
  if (requestedIndex === -1) return availableLevels[0] ?? 'low';

  for (let index = requestedIndex; index < effortLevels.length; index++) {
    const candidate = effortLevels[index];
    if (candidate && availableLevels.includes(candidate)) return candidate;
  }

  for (let index = requestedIndex - 1; index >= 0; index--) {
    const candidate = effortLevels[index];
    if (candidate && availableLevels.includes(candidate)) return candidate;
  }

  return availableLevels[0] ?? 'low';
};

export const providerAuthKind = (
  hasModels: boolean,
  hasSubscription: boolean,
  hasApiKey: boolean
): ProviderAuthKind => {
  if (!hasModels) return 'none';
  if (hasSubscription) return 'subscription';
  if (hasApiKey) return 'api_key';
  return 'unknown';
};

export const providerAuthLabel = (kind: ProviderAuthKind, hasCredentials: boolean) => {
  if (kind === 'subscription') return 'Connected via subscription';
  if (kind === 'api_key') return 'Connected via API key';
  if (kind === 'unknown') return 'Connected';
  if (hasCredentials) return 'Credentials found, no models available';
  return 'Not connected';
};

export const providerAuthSlots = (provider: string): string[] => {
  if (provider === 'openai') return ['openai', 'openai-codex'];
  return [provider];
};

export const isProviderModel = (model: { provider: string; id: string; name?: string }, provider: ProviderKey) => {
  const haystack = `${model.provider} ${model.id} ${model.name ?? ''}`.toLowerCase();
  if (provider === 'openai') {
    return (
      haystack.includes('openai') || haystack.includes('gpt') || haystack.includes('o3') || haystack.includes('o4')
    );
  }
  if (provider === 'google') {
    return haystack.includes('google') || haystack.includes('gemini');
  }

  return haystack.includes('anthropic') || haystack.includes('claude');
};

const allowedLatestOpenAiModelIds = ['gpt-5.5-pro', 'gpt-5.5', 'gpt-5.4-pro', 'gpt-5.4', 'gpt-5.3-codex-spark'];
const allowedLatestAnthropicModelIds = ['claude-opus-4-7', 'claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5'];
const allowedLatestGoogleModelIds = ['gemini-3.1-pro-preview', 'gemini-3.5-flash', 'gemini-2.5-pro'];

const allowedLatestOpenAiModelIdSet = new Set(allowedLatestOpenAiModelIds);
const allowedLatestAnthropicModelIdSet = new Set(allowedLatestAnthropicModelIds);
const allowedLatestGoogleModelIdSet = new Set(allowedLatestGoogleModelIds);

export const allowedLatestModelIds = (provider: ProviderKey) => {
  if (provider === 'openai') return allowedLatestOpenAiModelIdSet;
  if (provider === 'google') return allowedLatestGoogleModelIdSet;
  return allowedLatestAnthropicModelIdSet;
};

const allowedLatestModelOrder = (provider: ProviderKey) => {
  if (provider === 'openai') return allowedLatestOpenAiModelIds;
  if (provider === 'google') return allowedLatestGoogleModelIds;
  return allowedLatestAnthropicModelIds;
};

export const isAllowedLatestProviderModel = (
  model: { provider: string; id: string; name?: string },
  provider: ProviderKey
) => {
  return isProviderModel(model, provider) && allowedLatestModelIds(provider).has(model.id);
};

export const getLatestProviderModels = <T extends { provider: string; id: string; name?: string }>(
  provider: ProviderKey,
  models: T[]
) => {
  const order = allowedLatestModelOrder(provider);
  return models
    .filter((model) => isAllowedLatestProviderModel(model, provider))
    .sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
};

export const getVisibleModels = <T extends { provider: string; id: string; name?: string }>(models: T[]) => {
  const openAiModels = getLatestProviderModels('openai', models);
  const anthropicModels = getLatestProviderModels('anthropic', models);
  const googleModels = getLatestProviderModels('google', models);
  const latestModels = [...openAiModels, ...anthropicModels, ...googleModels];

  if (latestModels.length === 0) return models;
  return latestModels;
};

export const modelKey = (model: { provider: string; id: string }) => {
  return `${model.provider}:${model.id}`;
};

export const modelLabel = (model: { provider: string; name: string }) => {
  return model.name.replaceAll('-', ' ');
};

export const textDelta = (event: AgentSessionEvent) => {
  if (event.type !== 'message_update') return null;
  const update = event.assistantMessageEvent;
  if (update.type !== 'text_delta') return null;
  return update.delta;
};

export const thinkingDelta = (event: AgentSessionEvent) => {
  if (event.type !== 'message_update') return null;
  const update = event.assistantMessageEvent;
  if (update.type !== 'thinking_delta') return null;
  return update.delta;
};

export const agentEndError = (event: AgentSessionEvent) => {
  if (event.type !== 'agent_end') return;
  const lastMessage = event.messages.at(-1);
  if (!lastMessage || !('errorMessage' in lastMessage)) return;
  if (typeof lastMessage.errorMessage !== 'string') return;
  return lastMessage.errorMessage;
};
