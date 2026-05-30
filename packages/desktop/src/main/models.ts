import type { ProviderKey } from '@main/types';

export interface AllowedModel {
  id: string;
  provider: ProviderKey;
}

export const models: readonly AllowedModel[] = [
  { provider: 'openai', id: 'gpt-5.5' },
  { provider: 'openai', id: 'gpt-5.4' },
  { provider: 'anthropic', id: 'claude-opus-4-8' },
  { provider: 'anthropic', id: 'claude-sonnet-4-6' },
  { provider: 'anthropic', id: 'claude-haiku-4-5' },
  { provider: 'google', id: 'gemini-3.1-pro-preview' },
  { provider: 'google', id: 'gemini-3.5-flash' },
  { provider: 'google', id: 'gemini-2.5-pro' }
] as const;

const idsByProvider = (provider: ProviderKey) =>
  models.filter((model) => model.provider === provider).map((model) => model.id);

const openAiModelIds = idsByProvider('openai');
const googleModelIds = idsByProvider('google');
const anthropicModelIds = idsByProvider('anthropic');

const openAiModelIdSet = new Set(openAiModelIds);
const googleModelIdSet = new Set(googleModelIds);
const anthropicModelIdSet = new Set(anthropicModelIds);

export const allowedLatestModelIds = (provider: ProviderKey): ReadonlySet<string> => {
  if (provider === 'openai') return openAiModelIdSet;
  if (provider === 'google') return googleModelIdSet;
  return anthropicModelIdSet;
};

export const allowedLatestModelOrder = (provider: ProviderKey): readonly string[] => {
  if (provider === 'openai') return openAiModelIds;
  if (provider === 'google') return googleModelIds;
  return anthropicModelIds;
};
