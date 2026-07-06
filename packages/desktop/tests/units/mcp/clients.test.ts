import type { McpServer } from '@main/mcp/config';
import { UnauthorizedError } from '@modelcontextprotocol/sdk/client/auth.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const fakeClients = vi.hoisted(() => ({
  closed: 0,
  connects: 0,
  calls: [] as { params: unknown; options: unknown }[],
  connectErrors: [] as Error[]
}));

vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: class {
    async connect() {
      fakeClients.connects += 1;
      const error = fakeClients.connectErrors.shift();
      if (error) throw error;
    }

    async listTools() {
      return { tools: [{ name: 'ping', inputSchema: { type: 'object' } }] };
    }

    async callTool(params: unknown, _schema: unknown, options: unknown) {
      fakeClients.calls.push({ params, options });
      return { content: [{ type: 'text', text: 'pong' }] };
    }

    async close() {
      fakeClients.closed += 1;
    }
  }
}));

vi.mock('@modelcontextprotocol/sdk/client/stdio.js', () => ({
  getDefaultEnvironment: () => ({}),
  StdioClientTransport: class {}
}));

vi.mock('@modelcontextprotocol/sdk/client/streamableHttp.js', () => ({
  StreamableHTTPClientTransport: class {}
}));

const { callServerTool, connectServer, disposeMcpClients } = await import('@main/mcp/clients');

const remoteServer = (url = 'https://mcp.example.com/mcp'): McpServer => ({
  url,
  headers: {},
  name: 'svc',
  kind: 'remote',
  origin: 'global'
});

describe('mcp clients', () => {
  beforeEach(() => {
    disposeMcpClients();
    fakeClients.closed = 0;
    fakeClients.connects = 0;
    fakeClients.calls = [];
    fakeClients.connectErrors = [];
  });

  it('reuses one connected client per server', async () => {
    const server = remoteServer();

    const first = await connectServer(server);
    const second = await connectServer(server);

    expect(first.kind).toBe('connected');
    expect(second).toBe(first);
    expect(fakeClients.connects).toBe(1);
  });

  it('retries a failed connection on the next use', async () => {
    const server = remoteServer();
    fakeClients.connectErrors = [new Error('offline')];

    const failed = await connectServer(server);
    const retried = await connectServer(server);

    expect(failed).toEqual({ kind: 'failed', error: 'offline' });
    expect(retried.kind).toBe('connected');
    expect(fakeClients.connects).toBe(2);
  });

  it('keeps unauthorized connections cached', async () => {
    const server = remoteServer();
    fakeClients.connectErrors = [new UnauthorizedError('Unauthorized')];

    const first = await connectServer(server);
    const second = await connectServer(server);

    expect(first).toEqual({ kind: 'unauthorized' });
    expect(second).toBe(first);
    expect(fakeClients.connects).toBe(1);
  });

  it('reconnects when the server config changes and closes the old client', async () => {
    await connectServer(remoteServer());
    await connectServer(remoteServer('https://mcp.example.com/v2'));

    expect(fakeClients.connects).toBe(2);
    await vi.waitFor(() => expect(fakeClients.closed).toBe(1));
  });

  it('passes timeout and abort signal to tool calls', async () => {
    const server = remoteServer();
    const controller = new AbortController();

    await callServerTool(server, 'ping', { value: 1 }, { timeoutMs: 5_000, signal: controller.signal });

    expect(fakeClients.calls[0]?.params).toEqual({ name: 'ping', arguments: { value: 1 } });
    expect(fakeClients.calls[0]?.options).toEqual({ timeout: 5_000, signal: controller.signal });
  });

  it('surfaces unauthorized servers and unavailable servers as errors', async () => {
    fakeClients.connectErrors = [new UnauthorizedError('Unauthorized'), new Error('offline')];

    await expect(callServerTool(remoteServer(), 'ping', {}, { timeoutMs: 1_000 })).rejects.toBeInstanceOf(
      UnauthorizedError
    );
    await expect(
      callServerTool(remoteServer('https://mcp.example.com/v2'), 'ping', {}, { timeoutMs: 1_000 })
    ).rejects.toThrow('Server unavailable.');
  });

  it('closes every client on dispose', async () => {
    await connectServer(remoteServer());
    disposeMcpClients();

    await vi.waitFor(() => expect(fakeClients.closed).toBe(1));
    await connectServer(remoteServer());
    expect(fakeClients.connects).toBe(2);
  });
});
