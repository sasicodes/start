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
  { provider: 'openai', id: 'gpt-5.6-sol', score: { taste: 9, intelligence: 9, affordability: 3 } },
  { provider: 'openai', id: 'gpt-5.6-terra', score: { taste: 6, intelligence: 7, affordability: 7 } },
  { provider: 'openai', id: 'gpt-5.6-luna', score: { taste: 5, intelligence: 5, affordability: 9 } },
  { provider: 'openai', id: 'gpt-5.5', score: { taste: 7, intelligence: 7, affordability: 6 } },
  { provider: 'anthropic', id: 'claude-opus-4-8', score: { taste: 7, intelligence: 7, affordability: 6 } },
  { provider: 'anthropic', id: 'claude-fable-5', score: { taste: 9, intelligence: 9, affordability: 3 } },
  { provider: 'anthropic', id: 'claude-sonnet-5', score: { taste: 5, intelligence: 5, affordability: 9 } }
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
