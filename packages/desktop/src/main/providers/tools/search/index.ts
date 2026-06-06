import { defineTool, type ModelRegistry } from '@earendil-works/pi-coding-agent';
import { withSources, withUngroundedWarning } from '@main/providers/tools/search/helpers';
import { runWebSearch, unsupportedWebSearchMessage } from '@main/providers/tools/search/providers';
import type { SearchModel, SearchResult } from '@main/providers/tools/search/types';
import * as v from 'valibot';

export const noModelWebSearchMessage = 'No configured model is available for web search.';

const webSearchSchema = {
  properties: {
    query: {
      anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' }, minItems: 1 }],
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

const searchQuerySchema = v.pipe(
  v.union([
    v.string(),
    v.pipe(
      v.array(v.string()),
      v.transform((items) => items.join(' '))
    )
  ]),
  v.trim(),
  v.minLength(1, 'Enter a web search query.')
);

const queryValue = (query: unknown) => {
  const result = v.safeParse(searchQuerySchema, query);
  if (result.success) return result.output;
  throw new Error('Enter a web search query.');
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
