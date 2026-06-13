import { createFffTools } from '@main/providers/tools/fff/index';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const fffMock = vi.hoisted(() => ({
  grepWorkspace: vi.fn(),
  findWorkspacePaths: vi.fn(),
  multiGrepWorkspace: vi.fn()
}));

vi.mock('@main/search/fff', () => fffMock);

interface ToolResult {
  details?: Record<string, unknown>;
  content: Array<{ text: string; type: string }>;
}

interface RuntimeTool {
  execute: (
    toolCallId: string,
    params: Record<string, unknown>,
    signal: AbortSignal,
    onUpdate: () => void,
    context: Record<string, unknown>
  ) => Promise<unknown>;
}

const signal = new AbortController().signal;
const toolText = (result: ToolResult) => result.content.map((item) => item.text).join('\n');
const executeTool = async (tool: { execute: unknown }, params: Record<string, unknown>) => {
  const execute = tool.execute as RuntimeTool['execute'];
  return (await execute('tool-call', params, signal, vi.fn(), {})) as ToolResult;
};
const tools = () => {
  const [findTool, grepTool, multiGrepTool] = createFffTools({ cwd: () => '/repo' });
  if (!findTool || !grepTool || !multiGrepTool) throw new Error('Expected FFF tools.');
  return { findTool, grepTool, multiGrepTool };
};

describe('fff provider tools', () => {
  beforeEach(() => {
    fffMock.grepWorkspace.mockReset();
    fffMock.findWorkspacePaths.mockReset();
    fffMock.multiGrepWorkspace.mockReset();
  });

  it('formats FFF find results and marks the backend', async () => {
    fffMock.findWorkspacePaths.mockResolvedValue([
      { path: 'src/main/chat.ts', type: 'file' },
      { path: 'src/main', type: 'directory' }
    ]);

    const { findTool } = tools();
    const result = await executeTool(findTool, { pattern: 'chat', limit: 5 });

    expect(fffMock.findWorkspacePaths).toHaveBeenCalledWith({
      cwd: '/repo',
      limit: 5,
      pattern: 'chat'
    });
    expect(toolText(result)).toBe('src/main/chat.ts\nsrc/main/');
    expect(result.details).toEqual({
      backend: 'fff',
      query: 'chat',
      resultCount: 2
    });
  });

  it('caps FFF find limits before calling the shared finder', async () => {
    fffMock.findWorkspacePaths.mockResolvedValue([]);

    const { findTool } = tools();
    await executeTool(findTool, { pattern: 'chat', limit: 999 });

    expect(fffMock.findWorkspacePaths).toHaveBeenCalledWith({
      cwd: '/repo',
      limit: 200,
      pattern: 'chat'
    });
  });

  it('falls back to the built-in find tool when FFF is unavailable', async () => {
    fffMock.findWorkspacePaths.mockResolvedValue(null);

    const { findTool } = tools();
    const result = await executeTool(findTool, { pattern: 'chat' });

    expect(toolText(result)).toBe('fallback find');
  });

  it('formats FFF grep results with context and pagination details', async () => {
    fffMock.grepWorkspace.mockResolvedValue({
      totalFiles: 20,
      nextCursor: 12,
      searchedFiles: 4,
      matches: [
        {
          line: 8,
          path: 'src/main/chat.ts',
          contextAfter: ['after'],
          contextBefore: ['before'],
          isDefinition: true,
          text: 'const chat = true;'
        }
      ]
    });

    const { grepTool } = tools();
    const result = await executeTool(grepTool, { context: 1, cursor: 4, glob: '**/*.ts', limit: 10, pattern: 'chat' });

    expect(fffMock.grepWorkspace).toHaveBeenCalledWith({
      context: 1,
      cursor: 4,
      cwd: '/repo',
      glob: '**/*.ts',
      limit: 10,
      mode: 'regex',
      pattern: 'chat',
      classifyDefinitions: true
    });
    expect(toolText(result)).toBe(
      'src/main/chat.ts-7- before\nsrc/main/chat.ts:8: const chat = true;\nsrc/main/chat.ts-9- after\n\n[More matches available. Continue with cursor=12.]'
    );
    expect(result.details).toEqual({
      backend: 'fff',
      query: 'chat',
      totalFiles: 20,
      matchCount: 1,
      nextCursor: 12,
      searchedFiles: 4
    });
  });

  it('caps FFF grep limits and context before calling the shared finder', async () => {
    fffMock.grepWorkspace.mockResolvedValue({
      totalFiles: 20,
      nextCursor: 0,
      searchedFiles: 4,
      matches: []
    });

    const { grepTool } = tools();
    await executeTool(grepTool, { context: 99, limit: 999, pattern: 'chat' });

    expect(fffMock.grepWorkspace).toHaveBeenCalledWith({
      context: 3,
      cursor: 0,
      cwd: '/repo',
      limit: 100,
      mode: 'regex',
      pattern: 'chat',
      classifyDefinitions: true
    });
  });

  it('truncates oversized grep lines in tool output', async () => {
    fffMock.grepWorkspace.mockResolvedValue({
      totalFiles: 20,
      nextCursor: 0,
      searchedFiles: 4,
      matches: [
        {
          line: 8,
          path: 'src/main/chat.ts',
          contextAfter: [],
          contextBefore: [],
          isDefinition: true,
          text: 'x'.repeat(700)
        }
      ]
    });

    const { grepTool } = tools();
    const result = await executeTool(grepTool, { pattern: 'chat' });

    expect(toolText(result)).toContain(`${'x'.repeat(500)}...`);
    expect(toolText(result)).not.toContain('x'.repeat(700));
  });

  it('falls back to built-in content search when forced ignore-case is requested', async () => {
    const { grepTool } = tools();
    const result = await executeTool(grepTool, { ignoreCase: true, pattern: 'chat' });

    expect(fffMock.grepWorkspace).not.toHaveBeenCalled();
    expect(toolText(result)).toBe('fallback grep');
  });

  it('formats multi-grep results and reports unavailable workspaces', async () => {
    fffMock.multiGrepWorkspace.mockResolvedValueOnce({
      totalFiles: 20,
      nextCursor: 0,
      searchedFiles: 4,
      matches: [
        {
          line: 2,
          path: 'src/main/chat.ts',
          contextAfter: [],
          contextBefore: [],
          isDefinition: false,
          text: 'provider'
        }
      ]
    });
    fffMock.multiGrepWorkspace.mockResolvedValueOnce(null);

    const { multiGrepTool } = tools();
    const result = await executeTool(multiGrepTool, { constraints: '**/*.ts', patterns: ['provider'] });
    const unavailable = await executeTool(multiGrepTool, { patterns: ['provider'] });

    expect(toolText(result)).toBe('src/main/chat.ts:2: provider');
    expect(result.details).toEqual({
      backend: 'fff',
      totalFiles: 20,
      matchCount: 1,
      patterns: ['provider'],
      searchedFiles: 4
    });
    expect(toolText(unavailable)).toBe('FFF multi-grep is unavailable in this workspace.');
    expect(unavailable.details).toEqual({
      backend: 'fff',
      unavailable: true
    });
  });

  it('caps multi-grep patterns before calling the shared finder', async () => {
    fffMock.multiGrepWorkspace.mockResolvedValue({
      totalFiles: 20,
      nextCursor: 0,
      searchedFiles: 4,
      matches: []
    });

    const patterns = Array.from({ length: 12 }, (_, index) => `${index}-${'x'.repeat(700)}`);
    const { multiGrepTool } = tools();
    await executeTool(multiGrepTool, { context: 99, limit: 999, patterns });

    expect(fffMock.multiGrepWorkspace).toHaveBeenCalledWith({
      context: 3,
      cursor: 0,
      cwd: '/repo',
      limit: 100,
      classifyDefinitions: true,
      patterns: patterns.slice(0, 8).map((pattern) => pattern.slice(0, 512))
    });
  });
});
