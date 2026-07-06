import type { ModelRegistry } from '@earendil-works/pi-coding-agent';
import { isRecord, normalizeSourceUrl, resolveSearchAuth, searchProvider } from '@main/providers/tools/search/helpers';
import { createWebSearchTools, noModelWebSearchMessage } from '@main/providers/tools/search/index';
import { runWebSearch, unsupportedWebSearchMessage } from '@main/providers/tools/search/providers';
import type { SearchModel } from '@main/providers/tools/search/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { responseFromSse } from '../../../fakes/sse.js';

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

const codexToken = (accountId = 'account-1') => {
  const payload = Buffer.from(
    JSON.stringify({ 'https://api.openai.com/auth': { chatgpt_account_id: accountId } })
  ).toString('base64url');
  return `header.${payload}.signature`;
};

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
    expect(searchProvider(model({ provider: 'openai-codex', api: 'openai-responses' }))).toBe('openai');
    expect(searchProvider(model({ provider: 'openai-codex', api: 'openai-codex-responses' }))).toBe('openai');
    expect(searchProvider(model({ provider: 'anthropic', api: 'anthropic-messages' }))).toBe('anthropic');
    expect(searchProvider(model({ provider: 'openai', api: 'openai-completions' }))).toBeNull();
    expect(searchProvider(model({ provider: 'anthropic', api: 'openai-completions' }))).toBeNull();
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

  it('calls OpenAI Codex Responses web search with subscription headers', async () => {
    fetchMock.mockResolvedValue(responseFromSse([{ type: 'response.output_text.delta', delta: 'Codex answer' }]));

    const result = await runWebSearch({
      query: 'codex docs',
      signal: null,
      modelRegistry: registry({ ok: true, apiKey: codexToken('account-2') }),
      model: model({
        baseUrl: 'https://chatgpt.com/backend-api',
        api: 'openai-codex-responses',
        provider: 'openai-codex',
        id: 'gpt-5.3-codex'
      })
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://chatgpt.com/backend-api/codex/responses',
      expect.objectContaining({ method: 'POST' })
    );
    expect(requestHeaders()).toMatchObject({
      Authorization: `Bearer ${codexToken('account-2')}`,
      'OpenAI-Beta': 'responses=experimental',
      'chatgpt-account-id': 'account-2',
      originator: 'pi'
    });
    expect(requestBody()).toMatchObject({
      input: [{ role: 'user', content: [{ type: 'input_text', text: 'codex docs' }] }],
      instructions: 'Use web search to answer the user query with current, source-backed information.'
    });
    expect(result).toMatchObject({ text: 'Codex answer', provider: 'openai' });
  });

  it('uses provided Codex account headers without requiring a JWT-shaped token', async () => {
    fetchMock.mockResolvedValue(responseFromSse([]));

    await runWebSearch({
      query: 'codex docs',
      signal: null,
      modelRegistry: registry({
        ok: true,
        apiKey: 'opaque-token',
        headers: { 'chatgpt-account-id': 'provided-account' }
      }),
      model: model({
        baseUrl: 'https://chatgpt.com/backend-api',
        api: 'openai-codex-responses',
        provider: 'openai-codex',
        id: 'gpt-5.3-codex'
      })
    });

    expect(requestHeaders()).toMatchObject({
      Authorization: 'Bearer opaque-token',
      'chatgpt-account-id': 'provided-account'
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

  it('keeps provided Anthropic API key headers without adding duplicates', async () => {
    fetchMock.mockResolvedValue(responseFromSse([]));

    await runWebSearch({
      query: 'release notes',
      signal: null,
      modelRegistry: registry({ ok: true, apiKey: 'fallback-key', headers: { 'X-Api-Key': 'provided-key' } }),
      model: model({ provider: 'anthropic', api: 'anthropic-messages' })
    });

    expect(requestHeaders()).toMatchObject({ 'X-Api-Key': 'provided-key' });
    expect(requestHeaders()['x-api-key']).toBeFalsy();
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
    expect(result.details).not.toHaveProperty('resultCount');
  });

  it('returns a clear no-model result when no model is selected', async () => {
    const result = await tool(null).execute('call-1', { query: 'search' });

    expect(result.content[0]?.text).toBe(noModelWebSearchMessage);
    expect(result.details).toMatchObject({ error: 'no_model', query: 'search' });
  });

  it('accepts array query arguments from providers', async () => {
    fetchMock.mockResolvedValue(responseFromSse([{ type: 'response.output_text.delta', delta: 'Array answer' }]));

    const result = await tool(model({ provider: 'openai' })).execute('call-1', { query: ['array', 'query'] });

    expect(requestBody()).toMatchObject({ input: 'array query' });
    expect(result.content[0]?.text).toContain('Array answer');
  });

  it('adds sources and an ungrounded warning to tool output', async () => {
    fetchMock.mockResolvedValue(responseFromSse([{ type: 'response.output_text.delta', delta: 'Plain answer' }]));

    const result = await tool(model({ provider: 'openai' })).execute('call-1', { query: 'plain' });

    expect(result.content[0]?.text).toContain('Plain answer');
    expect(result.content[0]?.text).toContain('Search Verification');
    expect(result.details).toMatchObject({ grounded: false, provider: 'openai', resultCount: 0 });
  });

  it('returns a graceful rate-limited result when the provider keeps returning 429', async () => {
    vi.useFakeTimers();
    try {
      fetchMock.mockImplementation(
        async () => new Response('{"error":{"type":"rate_limit_error","message":"Too many requests"}}', { status: 429 })
      );

      const pending = tool(model({ provider: 'openai' })).execute('call-1', { query: 'busy' });
      await vi.advanceTimersByTimeAsync(30_000);
      const result = await pending;

      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(result.content[0]?.text).toBe('Web search is rate limited right now. Wait a moment and retry.');
      expect(result.details).toMatchObject({ error: 'rate_limited', query: 'busy', status: 429 });
      expect(result.details).not.toHaveProperty('resultCount');
    } finally {
      vi.useRealTimers();
    }
  });

  it('returns a graceful failure result for non-retryable provider errors', async () => {
    fetchMock.mockResolvedValue(new Response('bad request', { status: 400 }));

    const result = await tool(model({ provider: 'openai' })).execute('call-1', { query: 'broken' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.content[0]?.text).toBe('Web search failed upstream. Try again shortly.');
    expect(result.details).toMatchObject({ error: 'search_failed', query: 'broken', status: 400 });
  });

  it('maps mid-stream rate limits to a graceful result once content has streamed', async () => {
    fetchMock.mockResolvedValue(
      responseFromSse([
        { type: 'content_block_delta', delta: { type: 'text_delta', text: 'partial' } },
        { type: 'error', error: { type: 'rate_limit_error', message: 'Too many requests' } }
      ])
    );

    const result = await tool(model({ provider: 'anthropic', api: 'anthropic-messages' })).execute('call-1', {
      query: 'busy'
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.details).toMatchObject({ error: 'rate_limited', query: 'busy', status: 429 });
  });
});
