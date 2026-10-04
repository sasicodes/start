import { defineTool, type ToolDefinition } from '@earendil-works/pi-coding-agent';
import { type CallToolResult, type LlmContent, toLlmContent } from '@earendil-works/pi-mcp';
import {
  callServerTool,
  connectServer,
  type McpToolInfo,
  McpUnauthorizedError,
  pruneMcpClients,
  serverConnection
} from '@main/mcp/clients';
import { loadMcpServers, type McpServer } from '@main/mcp/config';
import { toolResult } from '@main/providers/tools/result';
import { withTimeout } from '@main/utils/timeout';

const maxImages = 4;
const maxImageLength = 8 * 1024 * 1024;
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

const resultContent = (result: CallToolResult) => {
  const content = toLlmContent(result).filter((item) => item.type === 'image' || item.text.trim());
  const hasText = content.some((item) => item.type === 'text');
  if (hasText || !result.structuredContent) return content;
  return [{ type: 'text' as const, text: JSON.stringify(result.structuredContent, null, 2) }, ...content];
};

export const mcpOutputText = (result: CallToolResult) => {
  const text = resultContent(result)
    .flatMap((item) => (item.type === 'text' ? [item.text] : []))
    .join('\n')
    .trim();
  return truncatedText(text || 'Done.');
};

const omittedImage = (reason: string): LlmContent => ({ type: 'text', text: `[Image omitted: ${reason}.]` });

export const mcpContent = (result: CallToolResult): LlmContent[] => {
  let images = 0;
  let remaining = maxOutputLength;
  const content: LlmContent[] = [];

  for (const item of resultContent(result)) {
    if (item.type === 'image') {
      if (images >= maxImages) content.push(omittedImage('too many images'));
      else if (item.data.length > maxImageLength) content.push(omittedImage('too large'));
      else content.push(item);
      images += 1;
      continue;
    }
    if (remaining <= 0) continue;
    const fits = item.text.length <= remaining;
    content.push({ type: 'text', text: fits ? item.text : `${item.text.slice(0, remaining)}\n[Output truncated.]` });
    remaining -= item.text.length;
  }

  return content.length > 0 ? content : [{ type: 'text', text: 'Done.' }];
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
        const details: Record<string, unknown> = { server: server.name, ...(failed ? { failed } : {}) };
        return { details, content: mcpContent(result) };
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
