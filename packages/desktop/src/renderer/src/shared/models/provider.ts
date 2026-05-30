import type { ModelOption } from '@preload/index';

export type ModelProviderId = 'anthropic' | 'custom' | 'google' | 'openai';

const matches = (model: ModelOption, terms: string[]) => {
  const haystack = `${model.provider} ${model.id} ${model.name}`.toLowerCase();
  return terms.some((term) => haystack.includes(term));
};

export const modelProviderId = (model: ModelOption): ModelProviderId => {
  if (model.isCustom) return 'custom';
  if (model.provider === 'anthropic') return 'anthropic';
  if (model.provider === 'google') return 'google';
  if (model.provider === 'openai') return 'openai';
  if (matches(model, ['anthropic', 'claude'])) return 'anthropic';
  if (matches(model, ['gemini', 'google'])) return 'google';
  if (matches(model, ['gpt', 'openai', 'o3', 'o4'])) return 'openai';
  return 'custom';
};
