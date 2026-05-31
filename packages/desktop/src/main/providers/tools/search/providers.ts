import type { ModelRegistry } from '@earendil-works/pi-coding-agent';
import { searchAnthropic } from '@main/providers/tools/search/anthropic';
import { searchGoogle } from '@main/providers/tools/search/google';
import { searchProvider } from '@main/providers/tools/search/helpers';
import { searchOpenAi } from '@main/providers/tools/search/openai';
import type { SearchModel, SearchResult } from '@main/providers/tools/search/types';

const unsupportedMessage = 'Web search is only available for built-in OpenAI, Anthropic, and Google models.';

export const runWebSearch = async ({
  query,
  model,
  signal,
  modelRegistry
}: {
  query: string;
  model: SearchModel;
  signal: AbortSignal | null;
  modelRegistry: ModelRegistry;
}): Promise<SearchResult> => {
  const provider = searchProvider(model);
  if (!provider) throw new Error(unsupportedMessage);
  if (provider === 'openai') return searchOpenAi(query, model, modelRegistry, signal);
  if (provider === 'anthropic') return searchAnthropic(query, model, modelRegistry, signal);
  return searchGoogle(query, model, modelRegistry, signal);
};

export const unsupportedWebSearchMessage = unsupportedMessage;
