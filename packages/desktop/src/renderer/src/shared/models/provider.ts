import type { ModelOption } from '@preload/index';

export type ModelProviderId = 'anthropic' | 'google' | 'openai';

const matches = (model: ModelOption, terms: string[]) => {
  const haystack = `${model.provider} ${model.id} ${model.name}`.toLowerCase();
  return terms.some((term) => haystack.includes(term));
};

export const modelProviderId = (model: ModelOption): ModelProviderId => {
  if (matches(model, ['anthropic', 'claude'])) return 'anthropic';
  if (matches(model, ['gemini', 'google'])) return 'google';
  return 'openai';
};
