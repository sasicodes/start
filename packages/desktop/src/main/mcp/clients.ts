import { appVersion } from '@main/application';
import { expandServerVars, type McpServer } from '@main/mcp/config';
import { mcpAuthProvider } from '@main/mcp/oauth';
import { resolveServerVar } from '@main/mcp/secrets';
import { withTimeout } from '@main/utils/timeout';
import { UnauthorizedError } from '@modelcontextprotocol/sdk/client/auth.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { getDefaultEnvironment, StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';

export interface McpToolInfo {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export type McpConnection =
  | { kind: 'connected'; tools: McpToolInfo[] }
  | { kind: 'unauthorized' }
  | { kind: 'failed'; error: string };

interface ClientResult {
  client: Client | null;
  connection: McpConnection;
}

interface ClientEntry {
  key: string;
  lastUsedAt: number;
  result: Promise<ClientResult>;
  connection: McpConnection | null;
}

const clientIdleMs = 10 * 60 * 1000;
const connectTimeoutMs = 15_000;

const entries = new Map<string, ClientEntry>();

const serverKey = (server: McpServer) => JSON.stringify(server);

const failureText = (error: unknown) => (error instanceof Error ? error.message : 'Connection failed.');

const expandedVars = (server: McpServer, values: Record<string, string>) =>
  expandServerVars(values, (name) => resolveServerVar(server.name, name));

const serverTransport = (server: McpServer): Transport => {
  if (server.kind === 'stdio') {
    return new StdioClientTransport({
      command: server.command,
      args: server.args,
      stderr: 'ignore',
      env: { ...getDefaultEnvironment(), ...expandedVars(server, server.env) }
    }) as Transport;
  }

  return new StreamableHTTPClientTransport(new URL(server.url), {
    authProvider: mcpAuthProvider(server.name),
    requestInit: { headers: expandedVars(server, server.headers) }
  }) as Transport;
};

const connectWithin = async <T>(task: Promise<T>): Promise<T> => {
  const result = await withTimeout(task, connectTimeoutMs);
  if (result === null) throw new Error('Connection timed out.');
  return result;
};

const connectClient = async (server: McpServer): Promise<ClientResult> => {
  const client = new Client({ name: 'start', version: appVersion });

  try {
    await connectWithin(client.connect(serverTransport(server)));
    const listed = await connectWithin(client.listTools());
    return {
      client,
      connection: {
        kind: 'connected',
        tools: listed.tools.map((tool) => ({
          name: tool.name,
          description: tool.description ?? '',
          inputSchema: tool.inputSchema
        }))
      }
    };
  } catch (error) {
    client.close().catch(() => {});
    const connection: McpConnection =
      error instanceof UnauthorizedError ? { kind: 'unauthorized' } : { kind: 'failed', error: failureText(error) };
    return { client: null, connection };
  }
};

const closeEntry = (entry: ClientEntry) => {
  entry.result.then(({ client }) => client?.close().catch(() => {}));
};

export const pruneMcpClients = () => {
  const cutoff = Date.now() - clientIdleMs;

  for (const [name, entry] of entries) {
    if (entry.lastUsedAt >= cutoff) continue;
    closeEntry(entry);
    entries.delete(name);
  }
};

const serverEntry = (server: McpServer): ClientEntry => {
  pruneMcpClients();

  const key = serverKey(server);
  const current = entries.get(server.name);
  if (current && current.key === key) {
    current.lastUsedAt = Date.now();
    return current;
  }

  if (current) closeEntry(current);

  const entry: ClientEntry = { key, connection: null, lastUsedAt: Date.now(), result: connectClient(server) };
  entry.result.then(({ connection }) => {
    entry.connection = connection;
  });
  entries.set(server.name, entry);
  return entry;
};

export const connectServer = async (server: McpServer): Promise<McpConnection> => {
  const { connection } = await serverEntry(server).result;
  return connection;
};

export const serverConnection = (server: McpServer): McpConnection | null => {
  const entry = entries.get(server.name);
  return entry && entry.key === serverKey(server) ? entry.connection : null;
};

export const callServerTool = async (
  server: McpServer,
  toolName: string,
  args: Record<string, unknown>,
  timeoutMs: number
) => {
  const { client, connection } = await serverEntry(server).result;
  if (!client) {
    if (connection.kind === 'unauthorized') throw new UnauthorizedError('Authentication required.');
    throw new Error('Server unavailable.');
  }

  return await client.callTool({ name: toolName, arguments: args }, undefined, { timeout: timeoutMs });
};

export const dropServerClient = (name: string) => {
  const entry = entries.get(name);
  if (!entry) return;
  closeEntry(entry);
  entries.delete(name);
};

export const disposeMcpClients = () => {
  for (const entry of entries.values()) closeEntry(entry);
  entries.clear();
};
