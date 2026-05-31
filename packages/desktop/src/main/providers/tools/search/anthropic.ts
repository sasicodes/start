import type { ModelRegistry } from '@earendil-works/pi-coding-agent';
import { anthropicHeaders } from '@main/providers/tools/search/auth';
import { postSse } from '@main/providers/tools/search/fetcher';
import {
  addSource,
  addString,
  isRecord,
  recordItems,
  recordValue,
  sourceFromUrl,
  stringValue,
  trimTrailingSlash
} from '@main/providers/tools/search/helpers';
import type { SearchModel, SearchResult, SearchSource } from '@main/providers/tools/search/types';

const messagesUrl = (baseUrl: string) => {
  const base = trimTrailingSlash(baseUrl);
  return base.endsWith('/v1') ? `${base}/messages` : `${base}/v1/messages`;
};

export const searchAnthropic = async (
  query: string,
  model: SearchModel,
  modelRegistry: ModelRegistry,
  signal: AbortSignal | null
): Promise<SearchResult> => {
  const headers = await anthropicHeaders(modelRegistry, model, {
    Accept: 'text/event-stream',
    'Content-Type': 'application/json',
    'anthropic-version': '2023-06-01'
  });

  const maxTokens = Math.min(Math.max(1024, Math.floor(model.maxTokens / 3) || 4096), 8192);
  const body = {
    stream: true,
    max_tokens: maxTokens,
    model: model.id,
    messages: [{ role: 'user', content: query }],
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 5 }]
  };

  let text = '';
  const sources: SearchSource[] = [];
  const searchQueries: string[] = [];
  let nativeSearchSeen = false;

  await postSse({ body, headers, signal, label: 'Anthropic', url: messagesUrl(model.baseUrl) }, ({ data }) => {
    if (!isRecord(data)) return;
    const event = data;
    const type = stringValue(event.type);
    if (type === 'content_block_start') {
      const block = recordValue(event, 'content_block');
      const blockType = stringValue(recordValue(block, 'type'));
      if (blockType === 'text') {
        text += stringValue(recordValue(block, 'text'));
      } else if (blockType === 'server_tool_use' && stringValue(recordValue(block, 'name')) === 'web_search') {
        nativeSearchSeen = true;
        addString(searchQueries, recordValue(recordValue(block, 'input'), 'query'));
      } else if (blockType === 'web_search_tool_result') {
        nativeSearchSeen = true;
        for (const item of recordItems(recordValue(block, 'content'))) {
          const url = stringValue(item.url);
          if (url) addSource(sources, sourceFromUrl(url, stringValue(item.title)));
        }
      }
    } else if (type === 'content_block_delta') {
      const delta = recordValue(event, 'delta');
      const deltaType = stringValue(recordValue(delta, 'type'));
      if (deltaType === 'text_delta') {
        text += stringValue(recordValue(delta, 'text'));
      } else if (deltaType === 'citations_delta') {
        const citation = recordValue(delta, 'citation');
        const url = stringValue(recordValue(citation, 'url'));
        if (url) addSource(sources, sourceFromUrl(url, stringValue(recordValue(citation, 'title'))));
      }
    } else if (type === 'error') {
      throw new Error(
        stringValue(recordValue(recordValue(event, 'error'), 'message')) || 'Anthropic web search failed.'
      );
    }
  });

  const grounded = sources.length > 0 || nativeSearchSeen;
  return {
    sources,
    grounded,
    searchQueries,
    model: model.id,
    provider: 'anthropic',
    resultCount: sources.length,
    text: text.trim() || 'No answer returned.'
  };
};
