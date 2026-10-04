import { isJsonRpcRequest, McpAuthRequiredError, McpTimeoutError } from '@earendil-works/pi-mcp';
import type { McpServer } from '@main/mcp/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const fakeServers = vi.hoisted(() => ({
  closed: 0,
  connects: 0,
  silent: false,
  connectErrors: [] as Error[],
  transports: [] as Record<string, unknown>[],
  calls: [] as { name: unknown; arguments: unknown }[]
}));

vi.mock('@earendil-works/pi-mcp', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@earendil-works/pi-mcp')>();
  const { createInMemoryTransportPair } = await import('@earendil-works/pi-mcp/testing');

  const serverResult = (method: string, params: { name?: unknown; cursor?: unknown; arguments?: unknown }) => {
    if (method === 'initialize') {
      return { capabilities: { tools: {} }, protocolVersion: '2025-11-25', serverInfo: { name: 'fake', version: '1' } };
    }
    if (method === 'tools/list') {
      return params.cursor
        ? { tools: [{ name: 'pong', inputSchema: { type: 'object' } }] }
        : { nextCursor: 'next', tools: [{ name: 'ping', description: 'Ping', inputSchema: { type: 'object' } }] };
    }
    fakeServers.calls.push({ name: params.name, arguments: params.arguments });
    return { content: [{ type: 'text', text: 'pong' }] };
  };

  const fakeTransport = (options: Record<string, unknown>) => {
    fakeServers.transports.push(options);
    const { client, server } = createInMemoryTransportPair();
    const error = fakeServers.connectErrors.shift();

    server.onMessage((message) => {
      if (!isJsonRpcRequest(message)) return;
      if (message.method === 'tools/call' && fakeServers.silent) return;
      const result = serverResult(message.method, (message.params ?? {}) as { cursor?: unknown });
      server.send({ jsonrpc: '2.0', id: message.id, result }).catch(() => {});
    });
    server.start().catch(() => {});

    const start = client.start.bind(client);
    const close = client.close.bind(client);
    client.start = async () => {
      fakeServers.connects += 1;
      if (error) throw error;
      await start();
    };
    let closed = false;
    client.close = async () => {
      if (!closed) fakeServers.closed += 1;
      closed = true;
      await close();
    };
    return client;
  };

  return {
    ...actual,
    StdioTransport: vi.fn(function StdioTransport(options: Record<string, unknown>) {
      return fakeTransport(options);
    }),
    StreamableHttpTransport: vi.fn(function StreamableHttpTransport(options: Record<string, unknown>) {
      return fakeTransport(options);
    })
  };
});

const { connectServer, callServerTool, disposeMcpClients, McpUnauthorizedError } = await import('@main/mcp/clients');

const authError = () => new McpAuthRequiredError(new Response('', { status: 401 }));

const remoteServer = (url = 'https://mcp.example.com/mcp'): McpServer => ({
  url,
  headers: {},
  name: 'svc',
  kind: 'remote',
  origin: 'global'
});

const stdioServer: McpServer = {
  args: ['serve'],
  kind: 'stdio',
  name: 'local',
  origin: 'global',
  command: 'tool-server',
  env: { TOKEN: 'secret' }
};

describe('mcp clients', () => {
  beforeEach(() => {
    disposeMcpClients();
    fakeServers.closed = 0;
    fakeServers.calls = [];
    fakeServers.connects = 0;
    fakeServers.silent = false;
    fakeServers.transports = [];
    fakeServers.connectErrors = [];
  });

  it('reuses one connected client per server and lists every tool page', async () => {
    const server = remoteServer();

    const first = await connectServer(server);
    const second = await connectServer(server);

    expect(first).toEqual({
      kind: 'connected',
      tools: [
        { name: 'ping', description: 'Ping', inputSchema: { type: 'object' } },
        { name: 'pong', description: '', inputSchema: { type: 'object' } }
      ]
    });
    expect(second).toBe(first);
    expect(fakeServers.connects).toBe(1);
  });

  it('retries a failed connection on the next use', async () => {
    const server = remoteServer();
    fakeServers.connectErrors = [new Error('offline')];

    const failed = await connectServer(server);
    const retried = await connectServer(server);

    expect(failed).toEqual({ kind: 'failed', error: 'offline' });
    expect(retried.kind).toBe('connected');
    expect(fakeServers.connects).toBe(2);
  });

  it('keeps unauthorized connections cached', async () => {
    const server = remoteServer();
    fakeServers.connectErrors = [authError()];

    const first = await connectServer(server);
    const second = await connectServer(server);

    expect(first).toEqual({ kind: 'unauthorized' });
    expect(second).toBe(first);
    expect(fakeServers.connects).toBe(1);
  });

  it('reconnects when the server config changes and closes the old client', async () => {
    await connectServer(remoteServer());
    await connectServer(remoteServer('https://mcp.example.com/v2'));

    expect(fakeServers.connects).toBe(2);
    await vi.waitFor(() => expect(fakeServers.closed).toBe(1));
  });

  it('starts stdio servers with a minimal environment', async () => {
    await connectServer(stdioServer);

    expect(fakeServers.transports[0]).toMatchObject({
      args: ['serve'],
      inheritEnv: false,
      command: 'tool-server',
      env: { TOKEN: 'secret', PATH: process.env.PATH }
    });
  });

  it('calls tools with their arguments', async () => {
    const result = await callServerTool(remoteServer(), 'ping', { value: 1 }, { timeoutMs: 5_000 });

    expect(result.content).toEqual([{ type: 'text', text: 'pong' }]);
    expect(fakeServers.calls).toEqual([{ name: 'ping', arguments: { value: 1 } }]);
  });

  it('applies the timeout and abort signal to tool calls', async () => {
    fakeServers.silent = true;
    const controller = new AbortController();

    await expect(callServerTool(remoteServer(), 'ping', {}, { timeoutMs: 20 })).rejects.toBeInstanceOf(McpTimeoutError);

    const pending = callServerTool(remoteServer(), 'ping', {}, { timeoutMs: 5_000, signal: controller.signal });
    await vi.waitFor(() => expect(fakeServers.connects).toBe(1));
    controller.abort();
    await expect(pending).rejects.toThrow();
  });

  it('surfaces unauthorized servers and unavailable servers as errors', async () => {
    fakeServers.connectErrors = [authError(), new Error('offline')];

    await expect(callServerTool(remoteServer(), 'ping', {}, { timeoutMs: 1_000 })).rejects.toBeInstanceOf(
      McpUnauthorizedError
    );
    await expect(
      callServerTool(remoteServer('https://mcp.example.com/v2'), 'ping', {}, { timeoutMs: 1_000 })
    ).rejects.toThrow('Server unavailable.');
  });

  it('closes every client on dispose', async () => {
    await connectServer(remoteServer());
    disposeMcpClients();

    await vi.waitFor(() => expect(fakeServers.closed).toBe(1));
    await connectServer(remoteServer());
    expect(fakeServers.connects).toBe(2);
  });
});
