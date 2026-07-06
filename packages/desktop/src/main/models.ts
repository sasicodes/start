import type { ProviderKey } from '@main/types';

export interface AllowedModel {
  id: string;
  provider: ProviderKey;
}

export const models: readonly AllowedModel[] = [
  { provider: 'openai', id: 'gpt-5.5' },
  { provider: 'openai', id: 'gpt-5.4' },
  { provider: 'anthropic', id: 'claude-fable-5' },
  { provider: 'anthropic', id: 'claude-opus-4-8' },
  { provider: 'anthropic', id: 'claude-sonnet-5' }
] as const;

const idsByProvider = (provider: ProviderKey) =>
  models.filter((model) => model.provider === provider).map((model) => model.id);

const openAiModelIds = idsByProvider('openai');
const anthropicModelIds = idsByProvider('anthropic');

const openAiModelIdSet = new Set(openAiModelIds);
const anthropicModelIdSet = new Set(anthropicModelIds);

export const allowedLatestModelIds = (provider: ProviderKey): ReadonlySet<string> => {
  if (provider === 'openai') return openAiModelIdSet;
  return anthropicModelIdSet;
};

export const allowedLatestModelOrder = (provider: ProviderKey): readonly string[] => {
  if (provider === 'openai') return openAiModelIds;
  return anthropicModelIds;
};
