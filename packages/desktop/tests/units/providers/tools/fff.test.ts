import { createFffTools } from '@main/providers/tools/fff/index';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const fffMock = vi.hoisted(() => ({
  grepWorkspace: vi.fn(),
  findWorkspacePaths: vi.fn(),
  multiGrepWorkspace: vi.fn()
}));

const builtinMock = vi.hoisted(() => ({
  grepExecute: vi.fn(async () => ({ content: [{ text: 'fallback grep', type: 'text' }] }))
}));

const filesMock = vi.hoisted(() => ({
  findPathsWithRg: vi.fn()
}));

vi.mock('@main/search/client', () => fffMock);

vi.mock('@main/providers/tools/fff/files', () => filesMock);

vi.mock('@earendil-works/pi-coding-agent', () => ({
  createGrepTool: () => ({ execute: builtinMock.grepExecute }),
  defineTool: <T>(tool: T) => tool
}));

interface ToolResult {
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
    filesMock.findPathsWithRg.mockReset();
    builtinMock.grepExecute.mockClear();
  });

  it('formats find results', async () => {
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

  it('falls back to rg file listing when the index is unavailable', async () => {
    fffMock.findWorkspacePaths.mockResolvedValue(null);
    filesMock.findPathsWithRg.mockResolvedValue([{ path: 'src/config.ts', type: 'file' }]);

    const { findTool } = tools();
    const result = await executeTool(findTool, { path: 'src', pattern: 'src config' });

    expect(toolText(result)).toBe('src/config.ts');
    expect(filesMock.findPathsWithRg).toHaveBeenCalledWith({
      cwd: '/repo',
      path: 'src',
      limit: 200,
      signal,
      pattern: 'src config'
    });
  });

  it('reports unavailable file search when the rg fallback fails', async () => {
    fffMock.findWorkspacePaths.mockResolvedValue(null);
    filesMock.findPathsWithRg.mockResolvedValue(null);

    const { findTool } = tools();
    const result = await executeTool(findTool, { pattern: 'chat' });

    expect(toolText(result)).toBe('File search is unavailable in this workspace.');
  });

  it('formats grep results with context and pagination', async () => {
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
  });

  it('keeps the pagination hint after output truncation', async () => {
    fffMock.grepWorkspace.mockResolvedValue({
      totalFiles: 999,
      nextCursor: 77,
      searchedFiles: 999,
      matches: Array.from({ length: 200 }, (_, index) => ({
        line: index + 1,
        path: `src/file-${index}.ts`,
        contextAfter: [],
        contextBefore: [],
        isDefinition: false,
        text: 'y'.repeat(499)
      }))
    });

    const { grepTool } = tools();
    const result = await executeTool(grepTool, { limit: 100, pattern: 'y' });
    const text = toolText(result);

    expect(text).toContain('[Output truncated.]');
    expect(text.endsWith('[More matches available. Continue with cursor=77.]')).toBe(true);
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

  it('keeps forced ignore-case searches on FFF', async () => {
    fffMock.grepWorkspace.mockResolvedValue({
      totalFiles: 20,
      nextCursor: 0,
      searchedFiles: 4,
      matches: [
        {
          line: 8,
          contextAfter: [],
          contextBefore: [],
          isDefinition: true,
          path: 'src/main/config.ts',
          text: 'const TASK_TYPE_DIRS = []'
        }
      ]
    });

    const { grepTool } = tools();
    const result = await executeTool(grepTool, { ignoreCase: true, pattern: 'task_type_dirs' });

    expect(toolText(result)).toBe('src/main/config.ts:8: const TASK_TYPE_DIRS = []');
    expect(fffMock.grepWorkspace).toHaveBeenCalledWith({
      cwd: '/repo',
      limit: 100,
      cursor: 0,
      context: 0,
      mode: 'regex',
      ignoreCase: true,
      pattern: 'task_type_dirs',
      classifyDefinitions: true
    });
    expect(builtinMock.grepExecute).not.toHaveBeenCalled();
  });

  it('ignores malformed boolean search options', async () => {
    fffMock.grepWorkspace.mockResolvedValue({
      matches: [],
      totalFiles: 20,
      nextCursor: 0,
      searchedFiles: 4
    });

    const { grepTool } = tools();
    await executeTool(grepTool, { literal: 'true', ignoreCase: 'true', pattern: 'task_type_dirs' });

    expect(fffMock.grepWorkspace).toHaveBeenCalledWith({
      cwd: '/repo',
      limit: 100,
      cursor: 0,
      context: 0,
      mode: 'regex',
      pattern: 'task_type_dirs',
      classifyDefinitions: true
    });
  });

  it('preserves ignore-case and literal options when FFF is unavailable', async () => {
    fffMock.grepWorkspace.mockResolvedValue(null);

    const { grepTool } = tools();
    const result = await executeTool(grepTool, { literal: true, ignoreCase: true, pattern: 'TASK_TYPE_DIRS' });

    expect(toolText(result)).toBe('fallback grep');
    expect(builtinMock.grepExecute).toHaveBeenCalledWith(
      'tool-call',
      {
        limit: 100,
        context: 0,
        literal: true,
        ignoreCase: true,
        pattern: 'TASK_TYPE_DIRS'
      },
      signal,
      expect.any(Function)
    );
  });

  it('notes the pagination restart when a cursor request routes to the fallback', async () => {
    fffMock.grepWorkspace.mockResolvedValue(null);

    const { grepTool } = tools();
    const result = await executeTool(grepTool, { cursor: 9, pattern: 'chat' });

    expect(toolText(result)).toBe(
      '[Note: the search cursor is no longer available; results restart from the beginning.]\nfallback grep'
    );
  });

  it('notes the pagination restart when the cursor token has expired', async () => {
    fffMock.grepWorkspace.mockResolvedValue({
      totalFiles: 1,
      nextCursor: 0,
      restarted: true,
      searchedFiles: 1,
      matches: [
        {
          line: 2,
          path: 'src/main/chat.ts',
          contextAfter: [],
          contextBefore: [],
          isDefinition: false,
          text: 'const chat = true;'
        }
      ]
    });

    const { grepTool } = tools();
    const result = await executeTool(grepTool, { cursor: 9, pattern: 'chat' });

    expect(toolText(result)).toBe(
      '[Note: the search cursor is no longer available; results restart from the beginning.]\nsrc/main/chat.ts:2: const chat = true;'
    );
  });

  it('does not add a restart note to cursor-free fallback results', async () => {
    fffMock.grepWorkspace.mockResolvedValue(null);

    const { grepTool } = tools();
    const result = await executeTool(grepTool, { pattern: 'chat' });

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
    expect(toolText(unavailable)).toBe('Multi-pattern search is unavailable in this workspace. Use grep instead.');
  });

  it('rejects empty multi-grep patterns as invalid arguments instead of reporting unavailability', async () => {
    const { multiGrepTool } = tools();
    const result = await executeTool(multiGrepTool, { patterns: [''] });

    expect(fffMock.multiGrepWorkspace).not.toHaveBeenCalled();
    expect(toolText(result)).toBe('No valid patterns provided. Pass at least one non-empty pattern.');
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
