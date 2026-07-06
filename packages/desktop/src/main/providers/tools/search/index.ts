import { defineTool } from '@earendil-works/pi-coding-agent';
import { callServerTool } from '@main/mcp/clients';
import type { McpServer } from '@main/mcp/config';
import { mcpResultText } from '@main/mcp/tools';
import { toolResult } from '@main/providers/tools/result';
import { UnauthorizedError } from '@modelcontextprotocol/sdk/client/auth.js';
import * as v from 'valibot';

const callTimeoutMs = 30_000;
const maxOutputLength = 80_000;
const searchToolName = 'web_search_exa';
const searchFailedText = 'Web search failed. Try again shortly.';

const searchServer: McpServer = {
  kind: 'remote',
  name: 'web-search',
  origin: 'global',
  url: 'https://mcp.exa.ai/mcp',
  headers: {}
};

const webSearchSchema = {
  properties: {
    query: {
      anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' }, minItems: 1 }],
      description: 'Search query or question to answer from current public web sources.'
    }
  },
  type: 'object',
  required: ['query'],
  additionalProperties: false
} as const;

const searchQuerySchema = v.pipe(
  v.union([
    v.string(),
    v.pipe(
      v.array(v.string()),
      v.transform((items) => items.join(' '))
    )
  ]),
  v.trim(),
  v.minLength(1, 'Enter a web search query.')
);

const queryValue = (query: unknown) => {
  const result = v.safeParse(searchQuerySchema, query);
  if (result.success) return result.output;
  throw new Error('Enter a web search query.');
};

const boundedOutput = (text: string) =>
  text.length > maxOutputLength ? `${text.slice(0, maxOutputLength)}\n[Output truncated.]` : text;

export const createWebSearchTools = () => [
  defineTool({
    label: 'web',
    name: 'web_search',
    parameters: webSearchSchema,
    description: 'Search the public web.',
    promptSnippet: 'Use for current facts, package docs, news, pricing, standards, and source-backed research.',
    async execute(_toolCallId, { query }, _signal, onUpdate) {
      const searchQuery = queryValue(query);
      onUpdate?.(toolResult(`Searching the web for "${searchQuery}".`, { query: searchQuery }));

      try {
        const result = await callServerTool(searchServer, searchToolName, { query: searchQuery }, callTimeoutMs);
        const failed = result.isError === true;
        return toolResult(boundedOutput(mcpResultText(result)), {
          query: searchQuery,
          ...(failed ? { error: 'search_failed' } : {})
        });
      } catch (error) {
        const authRequired = error instanceof UnauthorizedError;
        return toolResult(authRequired ? 'Web search authentication failed.' : searchFailedText, {
          query: searchQuery,
          error: authRequired ? 'auth_required' : 'search_failed'
        });
      }
    }
  })
];
