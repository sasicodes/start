import type { ModelRegistry } from '@earendil-works/pi-coding-agent';
import { bearerHeaders } from '@main/providers/tools/search/auth';
import { postSse } from '@main/providers/tools/search/fetcher';
import {
  addSource,
  addString,
  isRecord,
  recordItems,
  recordValue,
  sourceFromUrl,
  stringItems,
  stringValue,
  trimTrailingSlash
} from '@main/providers/tools/search/helpers';
import type { JsonRecord, SearchModel, SearchResult, SearchSource } from '@main/providers/tools/search/types';

const openAiCitation = (annotation: JsonRecord): SearchSource | null => {
  const nested = recordValue(annotation, 'url_citation');
  const url = stringValue(annotation.url) || stringValue(recordValue(nested, 'url'));
  if (!url) return null;
  const title = stringValue(annotation.title) || stringValue(recordValue(nested, 'title'));
  return sourceFromUrl(url, title);
};

const collectOpenAiOutputItem = (item: JsonRecord, sources: SearchSource[], searchQueries: string[]) => {
  if (stringValue(item.type) === 'web_search_call') {
    const action = recordValue(item, 'action');
    addString(searchQueries, recordValue(action, 'query'));
    for (const query of stringItems(recordValue(action, 'queries'))) addString(searchQueries, query);
    for (const source of recordItems(recordValue(action, 'sources'))) {
      const url = stringValue(source.url);
      if (url) addSource(sources, sourceFromUrl(url, stringValue(source.title) || stringValue(source.display_name)));
    }
  }

  if (stringValue(item.type) !== 'message') return;
  for (const content of recordItems(item.content)) {
    if (stringValue(content.type) !== 'output_text') continue;
    for (const annotation of recordItems(content.annotations)) {
      const source = openAiCitation(annotation);
      if (source) addSource(sources, source);
    }
  }
};

export const searchOpenAi = async (
  query: string,
  model: SearchModel,
  modelRegistry: ModelRegistry,
  signal: AbortSignal | null
): Promise<SearchResult> => {
  const headers = await bearerHeaders(modelRegistry, model, {
    Accept: 'text/event-stream',
    'Content-Type': 'application/json'
  });
  const body = {
    stream: true,
    store: false,
    input: query,
    model: model.id,
    tools: [{ type: 'web_search' }],
    include: ['web_search_call.action.sources', 'web_search_call.results'],
    ...(model.reasoning ? { reasoning: { effort: 'none' } } : {})
  };

  let text = '';
  const sources: SearchSource[] = [];
  const searchQueries: string[] = [];
  let nativeSearchSeen = false;

  await postSse(
    { body, headers, signal, label: 'OpenAI', url: `${trimTrailingSlash(model.baseUrl)}/responses` },
    ({ data }) => {
      if (!isRecord(data)) return;
      const event = data;
      const type = stringValue(event.type);
      if (type === 'response.output_text.delta') {
        text += stringValue(event.delta);
      } else if (type === 'response.output_text.annotation.added') {
        const annotation = recordValue(event, 'annotation');
        if (isRecord(annotation)) {
          const source = openAiCitation(annotation);
          if (source) addSource(sources, source);
        }
      } else if (type === 'response.web_search_call.searching' || type === 'response.web_search_call.completed') {
        nativeSearchSeen = true;
      } else if (type === 'response.output_item.added' || type === 'response.output_item.done') {
        const item = recordValue(event, 'item');
        if (isRecord(item)) collectOpenAiOutputItem(item, sources, searchQueries);
      } else if (type === 'response.completed') {
        const responseRecord = recordValue(event, 'response');
        for (const item of recordItems(recordValue(responseRecord, 'output'))) {
          collectOpenAiOutputItem(item, sources, searchQueries);
        }
      } else if (type === 'response.failed' || type === 'error') {
        const error = recordValue(event, 'error') || recordValue(recordValue(event, 'response'), 'error');
        throw new Error(stringValue(recordValue(error, 'message')) || 'OpenAI web search failed.');
      }
    }
  );

  const grounded = sources.length > 0 || nativeSearchSeen;
  return {
    sources,
    grounded,
    searchQueries,
    model: model.id,
    provider: 'openai',
    resultCount: sources.length,
    text: text.trim() || 'No answer returned.'
  };
};
