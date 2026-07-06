import { createWebSearchTools, warmWebSearchTools } from '@main/providers/tools/search/index';
import { UnauthorizedError } from '@modelcontextprotocol/sdk/client/auth.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const clientsMock = vi.hoisted(() => ({
  callServerTool: vi.fn(),
  connectServer: vi.fn(),
  pruneMcpClients: vi.fn(),
  serverConnection: vi.fn()
}));

vi.mock('@main/mcp/clients', () => clientsMock);

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

const tool = () => createWebSearchTools()[0] as unknown as TestTool;

describe('web_search tool', () => {
  beforeEach(() => {
    clientsMock.callServerTool.mockReset();
    clientsMock.connectServer.mockReset();
    clientsMock.connectServer.mockResolvedValue({ kind: 'connected', tools: [] });
  });

  it('keeps the existing public tool name', () => {
    expect(tool().name).toBe('web_search');
  });

  it('rejects empty queries', async () => {
    await expect(tool().execute('call-1', { query: '   ' })).rejects.toThrow(/web search query/);
  });

  it('calls the hosted MCP search tool', async () => {
    clientsMock.callServerTool.mockResolvedValue({ content: [{ type: 'text', text: 'Search answer' }] });
    const updates: TestToolResult[] = [];

    const result = await tool().execute('call-1', { query: 'latest docs' }, undefined, (update) =>
      updates.push(update)
    );

    expect(clientsMock.callServerTool).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'remote',
        name: 'web-search',
        url: 'https://mcp.exa.ai/mcp'
      }),
      'web_search_exa',
      { query: 'latest docs' },
      { timeoutMs: 30_000 }
    );
    expect(updates[0]?.content[0]?.text).toBe('Searching the web for "latest docs".');
    expect(result.content[0]?.text).toBe('Search answer');
    expect(result.details).toEqual({ query: 'latest docs' });
  });

  it('warms the hosted MCP search server', async () => {
    warmWebSearchTools();

    await vi.waitFor(() =>
      expect(clientsMock.connectServer).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: 'remote',
          name: 'web-search',
          url: 'https://mcp.exa.ai/mcp'
        })
      )
    );
  });

  it('forwards the abort signal to the search call', async () => {
    clientsMock.callServerTool.mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] });
    const controller = new AbortController();

    await tool().execute('call-1', { query: 'cancelable' }, controller.signal);

    expect(clientsMock.callServerTool).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.anything(), {
      timeoutMs: 30_000,
      signal: controller.signal
    });
  });

  it('accepts array query arguments from providers', async () => {
    clientsMock.callServerTool.mockResolvedValue({ content: [{ type: 'text', text: 'Array answer' }] });

    const result = await tool().execute('call-1', { query: ['array', 'query'] });

    expect(clientsMock.callServerTool).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      { query: 'array query' },
      expect.anything()
    );
    expect(result.content[0]?.text).toBe('Array answer');
  });

  it('falls back to structured MCP content', async () => {
    clientsMock.callServerTool.mockResolvedValue({ content: [], structuredContent: { hits: 2 } });

    const result = await tool().execute('call-1', { query: 'structured' });

    expect(result.content[0]?.text).toBe('{"hits":2}');
  });

  it('marks MCP error results as failed details', async () => {
    clientsMock.callServerTool.mockResolvedValue({
      isError: true,
      content: [{ type: 'text', text: 'Rate limited' }]
    });

    const result = await tool().execute('call-1', { query: 'busy' });

    expect(result.content[0]?.text).toBe('Rate limited');
    expect(result.details).toEqual({ query: 'busy', error: 'search_failed' });
  });

  it('truncates oversized MCP output', async () => {
    clientsMock.callServerTool.mockResolvedValue({ content: [{ type: 'text', text: 'x'.repeat(90_000) }] });

    const text = (await tool().execute('call-1', { query: 'large' })).content[0]?.text ?? '';

    expect(text.endsWith('[Output truncated.]')).toBe(true);
    expect(text.length).toBeLessThan(81_000);
  });

  it('returns a graceful failure result when MCP search fails', async () => {
    clientsMock.callServerTool.mockRejectedValue(new Error('Server unavailable.'));

    const result = await tool().execute('call-1', { query: 'broken' });

    expect(result.content[0]?.text).toBe('Web search failed. Try again shortly.');
    expect(result.details).toEqual({ query: 'broken', error: 'search_failed' });
  });

  it('returns a clear authentication failure result', async () => {
    clientsMock.callServerTool.mockRejectedValue(new UnauthorizedError('Unauthorized'));

    const result = await tool().execute('call-1', { query: 'private' });

    expect(result.content[0]?.text).toBe('Web search authentication failed.');
    expect(result.details).toEqual({ query: 'private', error: 'auth_required' });
  });
});
