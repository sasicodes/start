import type { ModelRegistry } from '@earendil-works/pi-coding-agent';
import { providerHeaders } from '@main/providers/tools/search/auth';
import { postSse } from '@main/providers/tools/search/fetcher';
import {
  addSource,
  addString,
  recordItems,
  recordValue,
  sourceFromUrl,
  stringItems,
  stringValue,
  trimTrailingSlash
} from '@main/providers/tools/search/helpers';
import type { SearchModel, SearchResult, SearchSource } from '@main/providers/tools/search/types';

export const searchGoogle = async (
  query: string,
  model: SearchModel,
  modelRegistry: ModelRegistry,
  signal: AbortSignal | null
): Promise<SearchResult> => {
  const { auth, headers } = await providerHeaders(modelRegistry, model, {
    Accept: 'text/event-stream',
    'Content-Type': 'application/json'
  });
  if (auth.apiKey && !headers['x-goog-api-key']) headers['x-goog-api-key'] = auth.apiKey;

  const body = {
    tools: [{ google_search: {} }],
    contents: [{ role: 'user', parts: [{ text: query }] }]
  };

  let text = '';
  const sources: SearchSource[] = [];
  const searchQueries: string[] = [];

  await postSse(
    {
      body,
      headers,
      signal,
      label: 'Google',
      url: `${trimTrailingSlash(model.baseUrl)}/models/${model.id}:streamGenerateContent?alt=sse`
    },
    ({ data }) => {
      const error = recordValue(data, 'error') || recordValue(recordValue(data, 'response'), 'error');
      if (error) throw new Error(stringValue(recordValue(error, 'message')) || 'Google web search failed.');

      const payload = recordValue(data, 'response') || data;
      const candidate = recordItems(recordValue(payload, 'candidates'))[0];
      for (const part of recordItems(recordValue(recordValue(candidate, 'content'), 'parts'))) {
        text += stringValue(part.text);
      }

      const metadata = recordValue(candidate, 'groundingMetadata');
      for (const query of stringItems(recordValue(metadata, 'webSearchQueries'))) addString(searchQueries, query);
      for (const chunk of recordItems(recordValue(metadata, 'groundingChunks'))) {
        const web = recordValue(chunk, 'web');
        const url = stringValue(recordValue(web, 'uri'));
        if (url) addSource(sources, sourceFromUrl(url, stringValue(recordValue(web, 'title'))));
      }
    }
  );

  const grounded = sources.length > 0 || searchQueries.length > 0;
  return {
    sources,
    grounded,
    searchQueries,
    model: model.id,
    provider: 'google',
    resultCount: sources.length,
    text: text.trim() || 'No answer returned.'
  };
};
