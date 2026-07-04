import type { ModelRegistry } from '@earendil-works/pi-coding-agent';
import { searchAnthropic } from '@main/providers/tools/search/anthropic';
import { searchGoogle } from '@main/providers/tools/search/google';
import { searchProvider } from '@main/providers/tools/search/helpers';
import { createSearchLimiter, type SearchLimiter } from '@main/providers/tools/search/limiter';
import { searchOpenAi } from '@main/providers/tools/search/openai';
import type { SearchModel, SearchResult, WebSearchProvider } from '@main/providers/tools/search/types';

const unsupportedMessage = 'Web search is only available for built-in OpenAI, Anthropic, and Google models.';

const searchSpacingMs = 400;
const searchConcurrency = 2;
const limiters = new Map<WebSearchProvider, SearchLimiter>();

const providerLimiter = (provider: WebSearchProvider) => {
  const existing = limiters.get(provider);
  if (existing) return existing;

  const limiter = createSearchLimiter(searchConcurrency, searchSpacingMs);
  limiters.set(provider, limiter);
  return limiter;
};

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

  return providerLimiter(provider).run(signal, () => {
    if (provider === 'openai') return searchOpenAi(query, model, modelRegistry, signal);
    if (provider === 'anthropic') return searchAnthropic(query, model, modelRegistry, signal);
    return searchGoogle(query, model, modelRegistry, signal);
  });
};

export const unsupportedWebSearchMessage = unsupportedMessage;
