import { defineTool, type ToolDefinition } from '@earendil-works/pi-coding-agent';
import { type CallToolResult, toLlmContent } from '@earendil-works/pi-mcp';
import {
  callServerTool,
  connectServer,
  McpUnauthorizedError,
  type McpToolInfo,
  pruneMcpClients,
  serverConnection
} from '@main/mcp/clients';
import { loadMcpServers, type McpServer } from '@main/mcp/config';
import { toolResult } from '@main/providers/tools/result';
import { withTimeout } from '@main/utils/timeout';

const maxImages = 4;
const callTimeoutMs = 30_000;
const maxToolsPerServer = 40;
const maxOutputLength = 80_000;
const sessionToolBudgetMs = 1500;
const reservedServerName = 'web-search';
const reservedToolNames = ['web_search'];

const authRequiredText = (server: string) => `Authentication required for ${server}. Check the MCP server config.`;

export const mcpToolName = (server: string, tool: string) => `${server}_${tool}`.replace(/[^\w-]/gu, '_');

const truncatedText = (text: string) =>
  text.length > maxOutputLength ? `${text.slice(0, maxOutputLength)}\n[Output truncated.]` : text;

export const mcpOutput = (result: CallToolResult) => {
  const content = toLlmContent(result);
  let text = content
    .flatMap((item) => (item.type === 'text' ? [item.text] : []))
    .join('\n')
    .trim();
  if (!text && result.structuredContent) text = JSON.stringify(result.structuredContent, null, 2);
  const images = content.flatMap((item) => (item.type === 'image' ? [item] : [])).slice(0, maxImages);
  if (!text && images.length === 0) return { images, text: 'Done.' };
  return { images, text: truncatedText(text) };
};

export const mcpOutputText = (result: CallToolResult) => mcpOutput(result).text;

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
        const { text, images } = mcpOutput(result);
        const output = toolResult<Record<string, unknown>>(text, {
          server: server.name,
          ...(failed ? { failed } : {})
        });
        return { ...output, content: [...(text ? output.content : []), ...images] };
      } catch (error) {
        const authRequired = error instanceof McpUnauthorizedError;
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
