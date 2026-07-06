import type { McpServer } from '@main/mcp/config';
import { mcpToolName, mcpToolsForSession, warmMcpServers } from '@main/mcp/tools';
import { UnauthorizedError } from '@modelcontextprotocol/sdk/client/auth.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const clientsMock = vi.hoisted(() => ({
  connectServer: vi.fn(),
  callServerTool: vi.fn(),
  pruneMcpClients: vi.fn(),
  serverConnection: vi.fn()
}));

const configMock = vi.hoisted(() => ({
  servers: [] as McpServer[]
}));

vi.mock('@main/mcp/clients', () => clientsMock);

vi.mock('@main/mcp/config', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@main/mcp/config')>()),
  loadMcpServers: async () => configMock.servers
}));

interface ExecutableTool {
  name: string;
  execute: (
    toolCallId: string,
    params: unknown,
    signal?: AbortSignal
  ) => Promise<{ details: Record<string, unknown>; content: { text: string }[] }>;
}

const globalServer: McpServer = {
  kind: 'stdio',
  name: 'github',
  origin: 'global',
  command: 'npx',
  args: [],
  env: {}
};

const projectServer: McpServer = { ...globalServer, name: 'repo-tools', origin: 'project' };
const projectRemote: McpServer = {
  kind: 'remote',
  name: 'remote-tools',
  origin: 'project',
  url: 'https://mcp.example.com/mcp',
  headers: {}
};

const connected = (toolNames: string[]) => ({
  kind: 'connected' as const,
  tools: toolNames.map((name) => ({ name, description: '', inputSchema: { type: 'object' } }))
});

const sessionTools = async (workspacePath: string) =>
  (await mcpToolsForSession(workspacePath)) as unknown as ExecutableTool[];

describe('mcp tools', () => {
  beforeEach(() => {
    configMock.servers = [];
    clientsMock.connectServer.mockReset();
    clientsMock.callServerTool.mockReset();
    clientsMock.pruneMcpClients.mockReset();
    clientsMock.serverConnection.mockReset().mockReturnValue(null);
  });

  it('namespaces and sanitizes tool names', () => {
    expect(mcpToolName('github', 'create_issue')).toBe('github_create_issue');
    expect(mcpToolName('my server', 'do:thing')).toBe('my_server_do_thing');
  });

  it('wraps connected server tools and formats call results', async () => {
    configMock.servers = [globalServer];
    clientsMock.connectServer.mockResolvedValue(connected(['create_issue']));
    clientsMock.callServerTool.mockResolvedValue({ content: [{ type: 'text', text: 'created #7' }] });

    const tools = await sessionTools('/tmp/workspace');
    expect(tools.map((tool) => tool.name)).toEqual(['github_create_issue']);

    const result = await tools[0]?.execute('call-1', { title: 'bug' });
    expect(result?.content[0]?.text).toBe('created #7');
    expect(clientsMock.callServerTool).toHaveBeenCalledWith(
      globalServer,
      'create_issue',
      { title: 'bug' },
      {
        timeoutMs: 30_000
      }
    );
  });

  it('forwards the abort signal to server calls', async () => {
    configMock.servers = [globalServer];
    clientsMock.connectServer.mockResolvedValue(connected(['create_issue']));
    clientsMock.callServerTool.mockResolvedValue({ content: [] });
    const controller = new AbortController();

    const tools = await sessionTools('/tmp/workspace');
    await tools[0]?.execute('call-1', {}, controller.signal);

    expect(clientsMock.callServerTool).toHaveBeenCalledWith(
      globalServer,
      'create_issue',
      {},
      {
        timeoutMs: 30_000,
        signal: controller.signal
      }
    );
  });

  it('falls back to structured content and reports failed calls', async () => {
    configMock.servers = [globalServer];
    clientsMock.connectServer.mockResolvedValue(connected(['search']));
    clientsMock.callServerTool.mockResolvedValue({ content: [], isError: true, structuredContent: { hits: 0 } });

    const tools = await sessionTools('/tmp/workspace');
    const result = await tools[0]?.execute('call-1', {});

    expect(result?.content[0]?.text).toBe('{"hits":0}');
    expect(result?.details).toEqual({ failed: true, server: 'github' });
  });

  it('truncates oversized tool output', async () => {
    configMock.servers = [globalServer];
    clientsMock.connectServer.mockResolvedValue(connected(['dump']));
    clientsMock.callServerTool.mockResolvedValue({ content: [{ type: 'text', text: 'x'.repeat(90_000) }] });

    const tools = await sessionTools('/tmp/workspace');
    const text = (await tools[0]?.execute('call-1', {}))?.content[0]?.text ?? '';

    expect(text.endsWith('[Output truncated.]')).toBe(true);
    expect(text.length).toBeLessThan(81_000);
  });

  it('caps the number of tools registered per server', async () => {
    configMock.servers = [globalServer];
    clientsMock.connectServer.mockResolvedValue(connected(Array.from({ length: 45 }, (_, index) => `tool-${index}`)));

    const tools = await sessionTools('/tmp/workspace');
    expect(tools).toHaveLength(40);
  });

  it('reports authentication problems as tool text instead of throwing', async () => {
    configMock.servers = [globalServer];
    clientsMock.connectServer.mockResolvedValue(connected(['search']));
    clientsMock.callServerTool.mockRejectedValue(new UnauthorizedError('Unauthorized'));

    const tools = await sessionTools('/tmp/workspace');
    const result = await tools[0]?.execute('call-1', {});

    expect(result?.content[0]?.text).toBe('Authentication required for github. Check the MCP server config.');
    expect(result?.details).toEqual({ failed: true, server: 'github' });
  });

  it('drops tool names that collide with web_search or an earlier mcp tool', async () => {
    configMock.servers = [
      { ...globalServer, name: 'web' },
      { ...globalServer, name: 'my server' },
      { ...globalServer, name: 'my_server' }
    ];
    clientsMock.connectServer.mockImplementation(async (server: McpServer) =>
      connected(server.name === 'web' ? ['search'] : ['run'])
    );

    const tools = await sessionTools('/tmp/workspace');

    expect(tools.map((tool) => tool.name)).toEqual(['my_server_run']);
  });

  it('skips servers named after the built-in web search server', async () => {
    configMock.servers = [{ ...projectRemote, name: 'web-search' }];
    clientsMock.connectServer.mockResolvedValue(connected(['search']));

    const tools = await mcpToolsForSession('/tmp/workspace');

    expect(tools).toHaveLength(0);
    expect(clientsMock.connectServer).not.toHaveBeenCalled();
  });

  it('excludes project stdio servers from sessions', async () => {
    configMock.servers = [projectServer];
    clientsMock.connectServer.mockResolvedValue(connected(['lint']));

    const tools = await mcpToolsForSession('/tmp/workspace');

    expect(tools).toHaveLength(0);
    expect(clientsMock.connectServer).not.toHaveBeenCalled();
  });

  it('allows project remote servers', async () => {
    configMock.servers = [projectRemote];
    clientsMock.connectServer.mockResolvedValue(connected(['search']));

    const tools = await sessionTools('/tmp/workspace');

    expect(tools.map((tool) => tool.name)).toEqual(['remote-tools_search']);
  });

  it('warms safe servers only', async () => {
    configMock.servers = [projectServer];
    clientsMock.connectServer.mockResolvedValue(connected(['lint']));

    warmMcpServers('/tmp/workspace');

    await vi.waitFor(() => expect(clientsMock.pruneMcpClients).toHaveBeenCalled());
    expect(clientsMock.connectServer).not.toHaveBeenCalled();
  });

  it('warms project remote servers', async () => {
    configMock.servers = [projectRemote];
    clientsMock.connectServer.mockResolvedValue(connected(['search']));

    warmMcpServers('/tmp/workspace');

    await vi.waitFor(() => expect(clientsMock.connectServer).toHaveBeenCalledWith(projectRemote));
  });
});
