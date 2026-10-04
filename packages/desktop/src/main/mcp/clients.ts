import {
  type CallToolResult,
  McpAuthRequiredError,
  McpClient,
  type McpTransport,
  StdioTransport,
  StreamableHttpTransport
} from '@earendil-works/pi-mcp';
import { appVersion } from '@main/application';
import { baseEnvironment, readEnvironmentValue } from '@main/environment';
import { expandServerValue, expandServerVars, type McpServer } from '@main/mcp/config';
import { withTimeout } from '@main/utils/timeout';

export class McpUnauthorizedError extends Error {}

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
  client: McpClient | null;
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

const expandEnvironmentVars = (values: Record<string, string>) =>
  expandServerVars(values, (name) => readEnvironmentValue(name) || '');

const expandedValue = (value: string) => expandServerValue(value, (name) => readEnvironmentValue(name) || '');

const serverTransport = (server: McpServer): McpTransport => {
  if (server.kind === 'stdio') {
    return new StdioTransport({
      args: server.args,
      inheritEnv: false,
      command: server.command,
      env: { ...baseEnvironment(), ...expandEnvironmentVars(server.env) }
    });
  }

  return new StreamableHttpTransport({
    url: expandedValue(server.url),
    headers: expandEnvironmentVars(server.headers)
  });
};

const connectWithin = async <T>(task: Promise<T>): Promise<T> => {
  const result = await withTimeout(task, connectTimeoutMs);
  if (result === null) throw new Error('Connection timed out.');
  return result;
};

const connectClient = async (server: McpServer): Promise<ClientResult> => {
  const client = new McpClient({ name: 'start', version: appVersion });

  try {
    await connectWithin(client.connect(serverTransport(server)));
    const tools = await connectWithin(client.listTools());
    return {
      client,
      connection: {
        kind: 'connected',
        tools: tools.map((tool) => ({
          name: tool.name,
          description: tool.description ?? '',
          inputSchema: tool.inputSchema
        }))
      }
    };
  } catch (error) {
    client.close().catch(() => {});
    const connection: McpConnection =
      error instanceof McpAuthRequiredError ? { kind: 'unauthorized' } : { kind: 'failed', error: failureText(error) };
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
  if (current && current.key === key && current.connection?.kind !== 'failed') {
    current.lastUsedAt = Date.now();
    return current;
  }

  if (current) closeEntry(current);

  const entry: ClientEntry = { key, connection: null, lastUsedAt: Date.now(), result: connectClient(server) };
  entry.result
    .then(({ connection }) => {
      entry.connection = connection;
    })
    .catch(() => {});
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

export interface CallServerToolOptions {
  timeoutMs: number;
  signal?: AbortSignal;
}

export const callServerTool = async (
  server: McpServer,
  toolName: string,
  args: Record<string, unknown>,
  { signal, timeoutMs }: CallServerToolOptions
): Promise<CallToolResult> => {
  const { client, connection } = await serverEntry(server).result;
  if (!client) {
    if (connection.kind === 'unauthorized') throw new McpUnauthorizedError('Authentication required.');
    throw new Error('Server unavailable.');
  }

  try {
    return await client.callTool(toolName, args, { timeoutMs, ...(signal ? { signal } : {}) });
  } catch (error) {
    if (error instanceof McpAuthRequiredError) throw new McpUnauthorizedError('Authentication required.');
    throw error;
  }
};

export const disposeMcpClients = () => {
  for (const entry of entries.values()) closeEntry(entry);
  entries.clear();
};
