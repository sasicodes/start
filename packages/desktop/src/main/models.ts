import type { ProviderKey } from '@main/types';

export interface ModelScore {
  taste: number;
  intelligence: number;
  affordability: number;
}

export interface AllowedModel {
  id: string;
  score: ModelScore;
  provider: ProviderKey;
}

export const models: readonly AllowedModel[] = [
  { provider: 'openai', id: 'gpt-6-astra', score: { taste: 9, intelligence: 10, affordability: 1 } },
  { provider: 'openai', id: 'gpt-6.1-sol', score: { taste: 9, intelligence: 9, affordability: 7 } },
  { provider: 'openai', id: 'gpt-6-luna', score: { taste: 5, intelligence: 6, affordability: 10 } },
  { provider: 'anthropic', id: 'claude-fable-5-1', score: { taste: 9, intelligence: 9, affordability: 3 } },
  { provider: 'anthropic', id: 'claude-opus-5-5', score: { taste: 9, intelligence: 9, affordability: 4 } },
  { provider: 'anthropic', id: 'claude-sonnet-5-5', score: { taste: 8, intelligence: 7, affordability: 8 } },
  { provider: 'anthropic', id: 'claude-haiku-5-5', score: { taste: 5, intelligence: 6, affordability: 10 } }
] as const;

const scoresById = new Map(models.map((model) => [model.id, model.score]));

export const modelScore = (id: string): ModelScore | undefined => scoresById.get(id);

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
