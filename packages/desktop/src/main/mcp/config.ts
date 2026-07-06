import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { baseDir } from '@main/application';
import * as v from 'valibot';

export type McpOrigin = 'global' | 'project';

export interface StdioServer {
  kind: 'stdio';
  name: string;
  args: string[];
  command: string;
  origin: McpOrigin;
  env: Record<string, string>;
}

export interface RemoteServer {
  url: string;
  name: string;
  kind: 'remote';
  origin: McpOrigin;
  headers: Record<string, string>;
}

export type McpServer = StdioServer | RemoteServer;

const varPattern = /\$\{([A-Za-z_][A-Za-z0-9_]*)\}/gu;

const stringRecordSchema = v.record(v.string(), v.string());

const stdioEntrySchema = v.object({
  command: v.pipe(v.string(), v.trim(), v.minLength(1)),
  args: v.optional(v.array(v.string())),
  env: v.optional(stringRecordSchema)
});

const remoteEntrySchema = v.object({
  url: v.pipe(v.string(), v.trim(), v.url()),
  headers: v.optional(stringRecordSchema)
});

const configFileSchema = v.object({
  mcpServers: v.optional(v.record(v.string(), v.unknown()))
});

export const globalMcpConfigPath = () => join(baseDir, 'mcp.json');

export const projectMcpConfigPath = (workspacePath: string) => join(workspacePath, '.mcp.json');

const serverFromEntry = (name: string, origin: McpOrigin, entry: unknown): McpServer | null => {
  const stdio = v.safeParse(stdioEntrySchema, entry);
  if (stdio.success) {
    return {
      name,
      origin,
      kind: 'stdio',
      args: stdio.output.args ?? [],
      command: stdio.output.command,
      env: stdio.output.env ?? {}
    };
  }

  const remote = v.safeParse(remoteEntrySchema, entry);
  if (remote.success) {
    return {
      name,
      origin,
      kind: 'remote',
      url: remote.output.url,
      headers: remote.output.headers ?? {}
    };
  }

  return null;
};

export const parseMcpConfig = (source: string, origin: McpOrigin): McpServer[] => {
  if (!source.trim()) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch {
    return [];
  }

  const file = v.safeParse(configFileSchema, parsed);
  if (!file.success || !file.output.mcpServers) return [];

  return Object.entries(file.output.mcpServers).flatMap((serverEntry) => {
    const server = serverFromEntry(serverEntry[0], origin, serverEntry[1]);
    return server ? [server] : [];
  });
};

export const mergeMcpServers = (globalServers: McpServer[], projectServers: McpServer[]): McpServer[] => {
  const merged = new Map(globalServers.map((server) => [server.name, server]));
  for (const server of projectServers) merged.set(server.name, server);
  return [...merged.values()];
};

const readConfigSource = async (path: string) => {
  try {
    return await readFile(path, 'utf8');
  } catch {
    return '';
  }
};

export const loadMcpServers = async (workspacePath: string): Promise<McpServer[]> => {
  const [globalSource, projectSource] = await Promise.all([
    readConfigSource(globalMcpConfigPath()),
    readConfigSource(projectMcpConfigPath(workspacePath))
  ]);

  return mergeMcpServers(parseMcpConfig(globalSource, 'global'), parseMcpConfig(projectSource, 'project'));
};

export const expandServerValue = (value: string, resolve: (name: string) => string) =>
  value.replace(varPattern, (_, name: string) => resolve(name));

export const expandServerVars = (values: Record<string, string>, resolve: (name: string) => string) =>
  Object.fromEntries(Object.entries(values).map(([key, value]) => [key, expandServerValue(value, resolve)]));
