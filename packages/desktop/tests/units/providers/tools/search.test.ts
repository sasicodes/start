import type { ModelRegistry } from '@earendil-works/pi-coding-agent';
import { isRecord, normalizeSourceUrl, resolveSearchAuth, searchProvider } from '@main/providers/tools/search/helpers';
import { createWebSearchTools, noModelWebSearchMessage } from '@main/providers/tools/search/index';
import { runWebSearch, unsupportedWebSearchMessage } from '@main/providers/tools/search/providers';
import type { SearchModel } from '@main/providers/tools/search/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface TestToolResult {
  details: Record<string, unknown>;
  content: { text: string; type: string }[];
}

interface TestTool {
  name: string;
  execute: (
    toolCallId: string,
    args: Record<string, unknown>,
    signal?: AbortSignal,
    onUpdate?: (result: TestToolResult) => void
  ) => Promise<TestToolResult>;
}

const model = (overrides: Partial<SearchModel>): SearchModel => ({
  id: 'model-1',
  api: 'openai-responses',
  baseUrl: 'https://api.example.com/v1',
  provider: 'openai',
  reasoning: false,
  name: 'Model 1',
  input: ['text'],
  maxTokens: 12000,
  contextWindow: 128000,
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  ...overrides
});

const registry = (auth: Record<string, unknown> = { ok: true, apiKey: 'key-1' }) =>
  ({
    getApiKeyAndHeaders: vi.fn().mockResolvedValue(auth)
  }) as unknown as ModelRegistry;

const legacyRegistry = (apiKey: string) =>
  ({
    getApiKey: vi.fn().mockResolvedValue(apiKey)
  }) as unknown as ModelRegistry;

const requestInit = (index = 0) => {
  const init = fetchMock.mock.calls[index]?.[1];
  if (!isRecord(init)) throw new Error('Expected fetch request init.');
  return init;
};

const requestHeaders = (index = 0) => {
  const headers = requestInit(index).headers;
  if (!isRecord(headers)) throw new Error('Expected request headers.');
  return headers;
};

const requestBody = (index = 0) => {
  const body = requestInit(index).body;
  if (typeof body !== 'string') throw new Error('Expected string request body.');
  const value: unknown = JSON.parse(body);
  if (!isRecord(value)) throw new Error('Expected object request body.');
  return value;
};

const responseFromSse = (events: readonly Record<string, unknown>[]) => {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join('')));
        controller.close();
      }
    }),
    { status: 200 }
  );
};

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('web search helpers', () => {
  it('detects built-in providers and rejects custom providers', () => {
    expect(searchProvider(model({ provider: 'openai', api: 'openai-responses' }))).toBe('openai');
    expect(searchProvider(model({ provider: 'anthropic', api: 'anthropic-messages' }))).toBe('anthropic');
    expect(searchProvider(model({ provider: 'google', api: 'google-generative-ai' }))).toBe('google');
    expect(searchProvider(model({ provider: 'google-generative-ai', api: 'google-generative-ai' }))).toBe('google');
    expect(searchProvider(model({ provider: 'openai', api: 'openai-completions' }))).toBeNull();
    expect(searchProvider(model({ provider: 'anthropic', api: 'openai-completions' }))).toBeNull();
    expect(searchProvider(model({ provider: 'google', api: 'google-vertex' }))).toBeNull();
    expect(searchProvider(model({ provider: 'google-generative-ai', api: 'openai-completions' }))).toBeNull();
    expect(searchProvider(model({ provider: 'ollama', api: 'openai-completions' }))).toBeNull();
  });

  it('resolves auth headers or falls back to api keys', async () => {
    await expect(
      resolveSearchAuth(
        registry({ ok: true, headers: { Authorization: 'Bearer token' } }),
        model({ provider: 'openai' })
      )
    ).resolves.toEqual({ ok: true, headers: { Authorization: 'Bearer token' } });

    await expect(resolveSearchAuth(legacyRegistry('legacy-key'), model({ provider: 'openai' }))).resolves.toEqual({
      ok: true,
      apiKey: 'legacy-key'
    });
  });

  it('normalizes source URLs', () => {
    expect(normalizeSourceUrl('https://example.com/docs?utm_source=x&ref=y#top')).toBe('https://example.com/docs');
  });
});

describe('web search provider calls', () => {
  it('calls OpenAI Responses web search and parses citations', async () => {
    fetchMock.mockResolvedValue(
      responseFromSse([
        { type: 'response.web_search_call.searching' },
        { type: 'response.output_text.delta', delta: 'Answer' },
        {
          type: 'response.output_text.annotation.added',
          annotation: { type: 'url_citation', title: 'Docs', url: 'https://example.com/docs' }
        }
      ])
    );

    const result = await runWebSearch({
      query: 'latest docs',
      signal: null,
      modelRegistry: registry(),
      model: model({ provider: 'openai', id: 'gpt-5.5', baseUrl: 'https://api.openai.com/v1' })
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.openai.com/v1/responses',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer key-1' })
      })
    );
    const body = requestBody();
    expect(body).toMatchObject({ input: 'latest docs', stream: true, store: false, model: 'gpt-5.5' });
    expect(body.tools).toEqual([{ type: 'web_search' }]);
    expect(result).toMatchObject({
      text: 'Answer',
      grounded: true,
      provider: 'openai',
      sources: [{ title: 'Docs', url: 'https://example.com/docs' }]
    });
  });

  it('calls Anthropic Messages web search and parses search results', async () => {
    fetchMock.mockResolvedValue(
      responseFromSse([
        {
          type: 'content_block_start',
          content_block: { type: 'server_tool_use', name: 'web_search', input: { query: 'release notes' } }
        },
        {
          type: 'content_block_start',
          content_block: {
            type: 'web_search_tool_result',
            content: [{ title: 'Release Notes', url: 'https://example.com/releases' }]
          }
        },
        { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Anthropic answer' } }
      ])
    );

    const result = await runWebSearch({
      query: 'release notes',
      signal: null,
      modelRegistry: registry(),
      model: model({ provider: 'anthropic', api: 'anthropic-messages', id: 'claude-sonnet-4-6' })
    });

    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://api.example.com/v1/messages');
    const body = requestBody();
    expect(body.tools).toEqual([{ type: 'web_search_20250305', name: 'web_search', max_uses: 5 }]);
    expect(result).toMatchObject({
      text: 'Anthropic answer',
      grounded: true,
      provider: 'anthropic',
      searchQueries: ['release notes'],
      sources: [{ title: 'Release Notes', url: 'https://example.com/releases' }]
    });
  });

  it('uses Anthropic OAuth request headers when subscription auth is returned', async () => {
    fetchMock.mockResolvedValue(responseFromSse([]));

    await runWebSearch({
      query: 'release notes',
      signal: null,
      modelRegistry: registry({ ok: true, apiKey: 'sk-ant-oat-token' }),
      model: model({ provider: 'anthropic', api: 'anthropic-messages' })
    });

    expect(requestHeaders()).toMatchObject({
      Authorization: 'Bearer sk-ant-oat-token',
      'anthropic-beta': 'claude-code-20250219,oauth-2025-04-20',
      'user-agent': 'claude-cli/2.1.75',
      'x-app': 'cli'
    });
    expect(requestHeaders()['x-api-key']).toBeFalsy();
  });

  it('calls Gemini with Google Search grounding and parses grounding metadata', async () => {
    fetchMock.mockResolvedValue(
      responseFromSse([
        {
          candidates: [
            {
              content: { parts: [{ text: 'Gemini answer' }] },
              groundingMetadata: {
                webSearchQueries: ['gemini query'],
                groundingChunks: [{ web: { title: 'Gemini Docs', uri: 'https://example.com/gemini' } }]
              }
            }
          ]
        }
      ])
    );

    const result = await runWebSearch({
      query: 'gemini query',
      signal: null,
      modelRegistry: registry(),
      model: model({
        provider: 'google',
        api: 'google-generative-ai',
        id: 'gemini-3.5-flash',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta'
      })
    });

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:streamGenerateContent?alt=sse'
    );
    const body = requestBody();
    expect(body.tools).toEqual([{ google_search: {} }]);
    expect(result).toMatchObject({
      text: 'Gemini answer',
      grounded: true,
      provider: 'google',
      searchQueries: ['gemini query'],
      sources: [{ title: 'Gemini Docs', url: 'https://example.com/gemini' }]
    });
  });

  it('throws Google stream errors instead of returning an empty ungrounded result', async () => {
    fetchMock.mockResolvedValue(responseFromSse([{ error: { message: 'quota exceeded' } }]));

    await expect(
      runWebSearch({
        query: 'gemini query',
        signal: null,
        modelRegistry: registry(),
        model: model({
          provider: 'google',
          api: 'google-generative-ai',
          id: 'gemini-3.5-flash',
          baseUrl: 'https://generativelanguage.googleapis.com/v1beta'
        })
      })
    ).rejects.toThrow('quota exceeded');
  });

  it('marks answers ungrounded when no search metadata is returned', async () => {
    fetchMock.mockResolvedValue(responseFromSse([{ type: 'response.output_text.delta', delta: 'Plain answer' }]));

    const result = await runWebSearch({
      query: 'plain',
      signal: null,
      modelRegistry: registry(),
      model: model({ provider: 'openai' })
    });

    expect(result.grounded).toBe(false);
  });

  it('passes abort signals to provider fetches', async () => {
    const controller = new AbortController();
    fetchMock.mockResolvedValue(responseFromSse([]));

    await runWebSearch({
      query: 'abortable',
      signal: controller.signal,
      modelRegistry: registry(),
      model: model({ provider: 'openai' })
    });

    expect(requestInit().signal).toBe(controller.signal);
  });
});

describe('web_search tool', () => {
  const tool = (selectedModel: SearchModel | null) =>
    createWebSearchTools({ modelRegistry: registry(), model: () => selectedModel })[0] as unknown as TestTool;

  it('rejects empty queries', async () => {
    await expect(tool(model({ provider: 'openai' })).execute('call-1', { query: '   ' })).rejects.toThrow(
      /web search query/
    );
  });

  it('returns a clear unsupported-provider result for custom models', async () => {
    const result = await tool(model({ provider: 'ollama', api: 'openai-completions' })).execute('call-1', {
      query: 'search'
    });

    expect(result.content[0]?.text).toBe(unsupportedWebSearchMessage);
    expect(result.details).toMatchObject({ error: 'unsupported_provider', query: 'search' });
  });

  it('returns a clear no-model result when no model is selected', async () => {
    const result = await tool(null).execute('call-1', { query: 'search' });

    expect(result.content[0]?.text).toBe(noModelWebSearchMessage);
    expect(result.details).toMatchObject({ error: 'no_model', query: 'search' });
  });

  it('adds sources and an ungrounded warning to tool output', async () => {
    fetchMock.mockResolvedValue(responseFromSse([{ type: 'response.output_text.delta', delta: 'Plain answer' }]));

    const result = await tool(model({ provider: 'openai' })).execute('call-1', { query: 'plain' });

    expect(result.content[0]?.text).toContain('Plain answer');
    expect(result.content[0]?.text).toContain('Search Verification');
    expect(result.details).toMatchObject({ grounded: false, provider: 'openai', resultCount: 0 });
  });
});
