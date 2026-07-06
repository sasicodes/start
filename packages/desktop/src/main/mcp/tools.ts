import { defineTool, type ToolDefinition } from '@earendil-works/pi-coding-agent';
import { callServerTool, connectServer, type McpToolInfo, pruneMcpClients, serverConnection } from '@main/mcp/clients';
import { loadMcpServers, type McpServer } from '@main/mcp/config';
import { toolResult } from '@main/providers/tools/result';
import { withTimeout } from '@main/utils/timeout';
import { UnauthorizedError } from '@modelcontextprotocol/sdk/client/auth.js';
import * as v from 'valibot';

const callTimeoutMs = 30_000;
const maxToolsPerServer = 40;
const maxOutputLength = 80_000;
const sessionToolBudgetMs = 1500;
const reservedServerName = 'web-search';
const reservedToolNames = ['web_search'];

const authRequiredText = (server: string) => `Authentication required for ${server}. Check the MCP server config.`;

export const mcpToolName = (server: string, tool: string) => `${server}_${tool}`.replace(/[^\w-]/gu, '_');

const textContentSchema = v.object({ text: v.string(), type: v.literal('text') });

const callResultSchema = v.looseObject({
  structuredContent: v.optional(v.unknown()),
  content: v.optional(v.array(v.unknown()), [])
});

const mcpResultText = (result: unknown) => {
  const parsed = v.safeParse(callResultSchema, result);
  if (!parsed.success) return 'Done.';

  const text = parsed.output.content
    .flatMap((item) => {
      const entry = v.safeParse(textContentSchema, item);
      return entry.success ? [entry.output.text] : [];
    })
    .join('\n')
    .trim();

  if (text) return text;
  if (parsed.output.structuredContent) return JSON.stringify(parsed.output.structuredContent);
  return 'Done.';
};

export const mcpOutputText = (result: unknown) => {
  const text = mcpResultText(result);
  return text.length > maxOutputLength ? `${text.slice(0, maxOutputLength)}\n[Output truncated.]` : text;
};

const serverToolDefinition = (server: McpServer, tool: McpToolInfo): ToolDefinition =>
  defineTool({
    name: mcpToolName(server.name, tool.name),
    label: tool.name,
    parameters: tool.inputSchema,
    description: tool.description || `${tool.name} from the ${server.name} MCP server.`,
    async execute(_toolCallId, params, signal) {
      try {
        const result = await callServerTool(server, tool.name, (params ?? {}) as Record<string, unknown>, {
          timeoutMs: callTimeoutMs,
          ...(signal ? { signal } : {})
        });
        const failed = result.isError === true;
        return toolResult<Record<string, unknown>>(mcpOutputText(result), {
          server: server.name,
          ...(failed ? { failed } : {})
        });
      } catch (error) {
        const authRequired = error instanceof UnauthorizedError;
        const message = error instanceof Error ? error.message : 'Tool call failed.';
        return toolResult(authRequired ? authRequiredText(server.name) : message, {
          failed: true,
          server: server.name
        });
      }
    }
  }) as ToolDefinition;

const connectedTools = async (server: McpServer, budgetMs: number): Promise<ToolDefinition[]> => {
  const cached = serverConnection(server);
  const connection = cached?.kind === 'connected' ? cached : await withTimeout(connectServer(server), budgetMs);

  if (connection?.kind !== 'connected') return [];
  return connection.tools.slice(0, maxToolsPerServer).map((tool) => serverToolDefinition(server, tool));
};

const usableServer = (server: McpServer) =>
  server.name !== reservedServerName && (server.origin === 'global' || server.kind === 'remote');

const dedupeToolNames = (tools: ToolDefinition[]) => {
  const seen = new Set(reservedToolNames);
  return tools.filter((tool) => {
    if (seen.has(tool.name)) return false;
    seen.add(tool.name);
    return true;
  });
};

export const mcpToolsForSession = async (workspacePath: string): Promise<ToolDefinition[]> => {
  try {
    const servers = (await loadMcpServers(workspacePath)).filter(usableServer);
    const collected = await Promise.all(servers.map((server) => connectedTools(server, sessionToolBudgetMs)));
    return dedupeToolNames(collected.flat());
  } catch {
    return [];
  }
};

const warmServers = async (workspacePath: string) => {
  pruneMcpClients();

  for (const server of (await loadMcpServers(workspacePath)).filter(usableServer)) connectServer(server);
};

export const warmMcpServers = (workspacePath: string) => {
  warmServers(workspacePath).catch(() => {});
};
