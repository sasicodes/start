import { defineTool, type ModelRegistry } from '@earendil-works/pi-coding-agent';
import { unsupportedWebSearchMessage, runWebSearch } from '@main/providers/tools/search/providers';
import type { SearchModel, SearchResult } from '@main/providers/tools/search/types';
import { withSources, withUngroundedWarning } from '@main/providers/tools/search/helpers';

export const noModelWebSearchMessage = 'No configured model is available for web search.';

const webSearchSchema = {
  properties: {
    query: {
      type: 'string',
      description: 'Search query or question to answer from current public web sources.'
    }
  },
  type: 'object',
  required: ['query'],
  additionalProperties: false
} as const;

export interface CreateWebSearchToolsOptions {
  modelRegistry: ModelRegistry;
  model: () => SearchModel | null;
}

const toolResult = (text: string, details: Record<string, unknown>) => ({
  details,
  content: [{ text, type: 'text' as const }]
});

const queryValue = (query: unknown) => {
  if (typeof query !== 'string' || !query.trim()) throw new Error('Enter a web search query.');
  return query.trim();
};

export const createWebSearchTools = ({ model, modelRegistry }: CreateWebSearchToolsOptions) => [
  defineTool({
    label: 'web',
    name: 'web_search',
    parameters: webSearchSchema,
    description: 'Search the public web through the active built-in provider.',
    promptSnippet: 'Use for current facts, package docs, news, pricing, standards, and source-backed research.',
    async execute(_toolCallId, { query }, signal, onUpdate) {
      const searchQuery = queryValue(query);
      const selectedModel = model();
      if (!selectedModel) {
        return toolResult(noModelWebSearchMessage, {
          error: 'no_model',
          query: searchQuery
        });
      }

      onUpdate?.(toolResult(`Searching the web for "${searchQuery}".`, { query: searchQuery }));

      let result: SearchResult;
      try {
        result = await runWebSearch({
          modelRegistry,
          query: searchQuery,
          model: selectedModel,
          signal: signal ?? null
        });
      } catch (error) {
        if (error instanceof Error && error.message === unsupportedWebSearchMessage) {
          return toolResult(unsupportedWebSearchMessage, {
            query: searchQuery,
            error: 'unsupported_provider'
          });
        }
        throw error;
      }
      const sourcedText = withSources(result.text, result.sources);
      const text = withUngroundedWarning(sourcedText, result.grounded);
      return toolResult(text, {
        query: searchQuery,
        model: result.model,
        sources: result.sources,
        grounded: result.grounded,
        provider: result.provider,
        resultCount: result.resultCount,
        searchQueries: result.searchQueries
      });
    }
  })
];
