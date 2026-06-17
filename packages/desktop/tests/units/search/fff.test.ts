import { mkdirSync, mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type {
  FileFinderApi,
  GrepCursor,
  GrepMatch,
  GrepResult,
  MixedSearchResult,
  Result,
  SearchResult
} from '@ff-labs/fff-node';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fffMock = vi.hoisted(() => ({
  create: vi.fn()
}));

vi.mock('@ff-labs/fff-node', () => ({
  FileFinder: { create: fffMock.create }
}));

const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const noValue = (): void => {};
const okVoid = (): Result<void> => ({ ok: true, value: noValue() });

const emptySearch: SearchResult = {
  items: [],
  scores: [],
  totalFiles: 0,
  totalMatched: 0
};

const emptyMixed: MixedSearchResult = {
  items: [],
  scores: [],
  totalDirs: 0,
  totalFiles: 0,
  totalMatched: 0
};

const emptyGrep: GrepResult = {
  items: [],
  totalFiles: 0,
  nextCursor: null,
  totalMatched: 0,
  filteredFileCount: 0,
  totalFilesSearched: 0
};

const fileItem = (relativePath: string): SearchResult['items'][number] => ({
  size: 10,
  modified: 0,
  gitStatus: 'clean',
  fileName: path.basename(relativePath),
  accessFrecencyScore: 0,
  totalFrecencyScore: 0,
  relativePath,
  modificationFrecencyScore: 0
});

const mixedFile = (relativePath: string): MixedSearchResult['items'][number] => ({
  type: 'file',
  item: fileItem(relativePath)
});

const mixedDirectory = (relativePath: string): MixedSearchResult['items'][number] => ({
  type: 'directory',
  item: {
    maxAccessFrecency: 0,
    relativePath,
    dirName: path.basename(relativePath)
  }
});

const grepMatch = (relativePath: string, overrides: Partial<GrepMatch> = {}): GrepMatch => ({
  col: 0,
  size: 10,
  modified: 0,
  lineNumber: 5,
  isBinary: false,
  byteOffset: 0,
  gitStatus: 'clean',
  fileName: path.basename(relativePath),
  lineContent: 'const chat = true;',
  isDefinition: true,
  matchRanges: [[6, 10] as [number, number]],
  contextAfter: ['after'],
  contextBefore: ['before'],
  accessFrecencyScore: 0,
  totalFrecencyScore: 0,
  relativePath,
  modificationFrecencyScore: 0,
  ...overrides
});

const createFinder = (overrides: Partial<FileFinderApi>): FileFinderApi => ({
  destroy: vi.fn(),
  reindex: vi.fn(() => okVoid()),
  isScanning: vi.fn(() => false),
  fileSearch: vi.fn(() => ok(emptySearch)),
  glob: vi.fn(() => ok(emptySearch)),
  mixedSearch: vi.fn(() => ok(emptyMixed)),
  grep: vi.fn(() => ok(emptyGrep)),
  multiGrep: vi.fn(() => ok(emptyGrep)),
  scanFiles: vi.fn(() => okVoid()),
  refreshGitStatus: vi.fn(() => ok(0)),
  trackQuery: vi.fn(() => ok(true)),
  getBasePath: vi.fn(() => ok(null)),
  getHistoricalQuery: vi.fn(() => ok(null)),
  waitForScan: vi.fn(async () => ok(true)),
  waitForIndexReady: vi.fn(async () => ok(true)),
  waitForScanBlocking: vi.fn(() => ok(true)),
  getScanProgress: vi.fn(() =>
    ok({
      isScanning: false,
      isWatcherReady: true,
      scannedFilesCount: 0,
      isWarmupComplete: true
    })
  ),
  healthCheck: vi.fn(() =>
    ok({
      version: 'test',
      git: {
        available: true,
        repositoryFound: true,
        libgit2Version: 'test'
      },
      filePicker: {
        initialized: true
      },
      frecency: {
        initialized: false
      },
      queryTracker: {
        initialized: false
      }
    })
  ),
  isDestroyed: false,
  directorySearch: vi.fn(() =>
    ok({
      items: [],
      scores: [],
      totalDirs: 0,
      totalMatched: 0
    })
  ),
  ...overrides
});

describe('fff workspace manager', () => {
  let repoPath = '';
  let workspacePath = '';

  beforeEach(() => {
    repoPath = mkdtempSync(path.join(tmpdir(), 'start-fff-'));
    workspacePath = path.join(repoPath, 'packages', 'desktop');
    mkdirSync(workspacePath, { recursive: true });
    fffMock.create.mockReset();
  });

  afterEach(async () => {
    const { disposeWorkspaceFinders } = await import('@main/search/fff');
    disposeWorkspaceFinders();
    rmSync(repoPath, { recursive: true, force: true });
  });

  it('indexes the selected workspace without widening to the git root', async () => {
    const finder = createFinder({
      mixedSearch: vi.fn(() =>
        ok<MixedSearchResult>({
          scores: [],
          totalDirs: 1,
          totalFiles: 2,
          totalMatched: 2,
          items: [mixedFile('src/main/chat.ts'), mixedDirectory('src/main')]
        })
      )
    });
    fffMock.create.mockReturnValue(ok(finder));

    const { searchWorkspacePaths } = await import('@main/search/fff');
    const results = await searchWorkspacePaths({
      query: 'chat',
      limit: 10,
      workspaceRoot: workspacePath
    });

    expect(fffMock.create).toHaveBeenCalledWith({ basePath: realpathSync(workspacePath), aiMode: true });
    expect(finder.mixedSearch).toHaveBeenCalledWith('chat', { pageSize: 200 });
    expect(results).toEqual([
      { path: 'src/main/chat.ts', type: 'file' },
      { path: 'src/main', type: 'directory' }
    ]);
  });

  it('maps grep results and round-trips opaque cursors through numeric tokens', async () => {
    const opaqueCursor = { _offset: 9, __brand: 'GrepCursor' } as GrepCursor;
    const finder = createFinder({
      grep: vi.fn(() =>
        ok<GrepResult>({
          totalFiles: 12,
          totalMatched: 1,
          filteredFileCount: 12,
          totalFilesSearched: 3,
          nextCursor: opaqueCursor,
          items: [grepMatch('src/main/chat.ts')]
        })
      )
    });
    fffMock.create.mockReturnValue(ok(finder));

    const { grepWorkspace } = await import('@main/search/fff');
    const result = await grepWorkspace({
      limit: 20,
      pattern: 'chat',
      cwd: workspacePath
    });

    expect(finder.grep).toHaveBeenCalledWith(
      'chat',
      expect.objectContaining({
        mode: 'plain',
        pageSize: 20,
        maxFileSize: 2 * 1024 * 1024,
        timeBudgetMs: 2000,
        maxMatchesPerFile: 20,
        classifyDefinitions: false
      })
    );
    expect(finder.grep).not.toHaveBeenCalledWith('chat', expect.objectContaining({ cursor: expect.anything() }));
    expect(result?.nextCursor).toBeGreaterThan(0);
    expect(result?.matches).toEqual([
      {
        line: 5,
        isDefinition: true,
        path: 'src/main/chat.ts',
        text: 'const chat = true;',
        contextAfter: ['after'],
        contextBefore: ['before']
      }
    ]);

    await grepWorkspace({
      limit: 20,
      pattern: 'chat',
      cwd: workspacePath,
      cursor: result?.nextCursor ?? 0
    });

    expect(finder.grep).toHaveBeenLastCalledWith('chat', expect.objectContaining({ cursor: opaqueCursor }));
  });

  it('flags unknown cursor tokens as restarts instead of fabricating offsets', async () => {
    const finder = createFinder({});
    fffMock.create.mockReturnValue(ok(finder));

    const { grepWorkspace } = await import('@main/search/fff');
    const result = await grepWorkspace({
      cursor: 987_654,
      limit: 20,
      pattern: 'chat',
      cwd: workspacePath
    });

    expect(finder.grep).not.toHaveBeenCalledWith('chat', expect.objectContaining({ cursor: expect.anything() }));
    expect(result?.restarted).toBe(true);
  });

  it('formats directory grep constraints with the slash FFF expects', async () => {
    mkdirSync(path.join(workspacePath, 'src', 'main'), { recursive: true });

    const finder = createFinder({
      grep: vi.fn(() =>
        ok<GrepResult>({
          totalFiles: 12,
          totalMatched: 1,
          filteredFileCount: 12,
          totalFilesSearched: 3,
          nextCursor: null,
          items: [grepMatch('src/main/providers/tools/fff.ts')]
        })
      )
    });
    fffMock.create.mockReturnValue(ok(finder));

    const { grepWorkspace } = await import('@main/search/fff');
    const result = await grepWorkspace({
      limit: 20,
      path: 'src/main',
      pattern: 'createFffTools',
      cwd: workspacePath
    });

    expect(finder.grep).toHaveBeenCalledWith(
      'src/main/ createFffTools',
      expect.objectContaining({
        mode: 'plain',
        pageSize: 20
      })
    );
    expect(result?.matches).toEqual([
      {
        line: 5,
        isDefinition: true,
        path: 'src/main/providers/tools/fff.ts',
        text: 'const chat = true;',
        contextAfter: ['after'],
        contextBefore: ['before']
      }
    ]);
  });

  it('forces regex grep to ignore case without leaving FFF', async () => {
    mkdirSync(path.join(workspacePath, 'src', 'main'), { recursive: true });

    const finder = createFinder({});
    fffMock.create.mockReturnValue(ok(finder));

    const { grepWorkspace } = await import('@main/search/fff');
    await grepWorkspace({
      limit: 20,
      mode: 'regex',
      glob: '**/*.ts',
      path: 'src/main',
      ignoreCase: true,
      cwd: workspacePath,
      pattern: 'TASK_TYPE_DIRS'
    });

    expect(finder.grep).toHaveBeenCalledWith(
      'src/main/ **/*.ts (?i:TASK_TYPE_DIRS)',
      expect.objectContaining({
        mode: 'regex',
        smartCase: false
      })
    );
  });

  it('forces plain grep to ignore case without leaving FFF', async () => {
    const finder = createFinder({});
    fffMock.create.mockReturnValue(ok(finder));

    const { grepWorkspace } = await import('@main/search/fff');
    await grepWorkspace({
      limit: 20,
      mode: 'plain',
      cwd: workspacePath,
      ignoreCase: true,
      pattern: 'TASK_TYPE_DIRS'
    });

    expect(finder.grep).toHaveBeenCalledWith(
      'task_type_dirs',
      expect.objectContaining({
        mode: 'plain',
        smartCase: true
      })
    );
  });

  it('shares an in-flight finder creation for concurrent calls to the same workspace', async () => {
    const finder = createFinder({});
    fffMock.create.mockReturnValue(ok(finder));

    const { searchWorkspacePaths } = await import('@main/search/fff');
    await Promise.all([
      searchWorkspacePaths({ limit: 5, waitMs: 0, query: 'chat', workspaceRoot: workspacePath }),
      searchWorkspacePaths({ limit: 5, waitMs: 0, query: 'settings', workspaceRoot: workspacePath })
    ]);

    expect(fffMock.create).toHaveBeenCalledTimes(1);
  });

  it('returns null when native finder creation throws', async () => {
    fffMock.create.mockImplementation(() => {
      throw new Error('native load failed');
    });

    const { findWorkspacePaths } = await import('@main/search/fff');
    await expect(findWorkspacePaths({ limit: 5, pattern: 'chat', cwd: workspacePath })).resolves.toBeNull();
  });

  it('returns null instead of searching when the index is not ready within the caller budget', async () => {
    const finder = createFinder({
      mixedSearch: vi.fn(() => ok(emptyMixed)),
      waitForIndexReady: vi.fn(async () => ok(false))
    });
    fffMock.create.mockReturnValue(ok(finder));

    const { searchWorkspacePaths } = await import('@main/search/fff');
    const result = await searchWorkspacePaths({
      limit: 10,
      waitMs: 1,
      query: 'chat',
      workspaceRoot: workspacePath
    });

    expect(result).toBeNull();
    expect(finder.mixedSearch).not.toHaveBeenCalled();
  });

  it('skips the readiness wait for UI budgets while the initial scan runs', async () => {
    const finder = createFinder({
      isScanning: vi.fn(() => true),
      mixedSearch: vi.fn(() => ok(emptyMixed)),
      waitForIndexReady: vi.fn(() => new Promise<Result<boolean>>(() => {}))
    });
    fffMock.create.mockReturnValue(ok(finder));

    const { searchWorkspacePaths } = await import('@main/search/fff');
    const result = await searchWorkspacePaths({
      limit: 10,
      query: 'chat',
      workspaceRoot: workspacePath
    });

    expect(result).toBeNull();
    expect(finder.mixedSearch).not.toHaveBeenCalled();
  });

  it('recovers once the index becomes ready after an initial timeout', async () => {
    let indexReady = false;
    const finder = createFinder({
      waitForIndexReady: vi.fn(async () => ok(indexReady)),
      mixedSearch: vi.fn(() =>
        ok<MixedSearchResult>({
          scores: [],
          totalDirs: 0,
          totalFiles: 1,
          totalMatched: 1,
          items: [mixedFile('src/main/chat.ts')]
        })
      )
    });
    fffMock.create.mockReturnValue(ok(finder));

    const { searchWorkspacePaths } = await import('@main/search/fff');
    const blocked = await searchWorkspacePaths({ limit: 10, query: 'chat', workspaceRoot: workspacePath });
    indexReady = true;
    const recovered = await searchWorkspacePaths({ limit: 10, query: 'chat', workspaceRoot: workspacePath });

    expect(blocked).toBeNull();
    expect(recovered).toEqual([{ path: 'src/main/chat.ts', type: 'file' }]);
  });

  it('passes workspace-relative find constraints to FFF as index-relative constraints', async () => {
    const finder = createFinder({
      glob: vi.fn(() =>
        ok<SearchResult>({
          scores: [],
          totalFiles: 1,
          totalMatched: 1,
          items: [fileItem('src/main/chat.ts')]
        })
      ),
      fileSearch: vi.fn(() =>
        ok<SearchResult>({
          scores: [],
          totalFiles: 1,
          totalMatched: 1,
          items: [fileItem('src/main/settings.ts')]
        })
      )
    });
    fffMock.create.mockReturnValue(ok(finder));

    const { findWorkspacePaths } = await import('@main/search/fff');
    const globResult = await findWorkspacePaths({
      limit: 5,
      pattern: '*.ts',
      path: 'src/main',
      cwd: workspacePath
    });
    const fuzzyResult = await findWorkspacePaths({
      limit: 5,
      pattern: 'settings',
      path: 'src/main',
      cwd: workspacePath
    });

    expect(finder.glob).toHaveBeenCalledWith('src/main/*.ts', { pageSize: 5 });
    expect(finder.fileSearch).toHaveBeenCalledWith('src/main/ settings', { pageSize: 5 });
    expect(globResult).toEqual([{ path: 'src/main/chat.ts', type: 'file' }]);
    expect(fuzzyResult).toEqual([{ path: 'src/main/settings.ts', type: 'file' }]);
  });

  it('maps multi-grep results and prefixes constraints with the active workspace path', async () => {
    const finder = createFinder({
      multiGrep: vi.fn(() =>
        ok<GrepResult>({
          totalFiles: 9,
          totalMatched: 2,
          filteredFileCount: 9,
          totalFilesSearched: 4,
          nextCursor: { _offset: 18, __brand: 'GrepCursor' } as GrepCursor,
          items: [grepMatch('src/main/chat.ts')]
        })
      )
    });
    fffMock.create.mockReturnValue(ok(finder));

    const { multiGrepWorkspace } = await import('@main/search/fff');
    const result = await multiGrepWorkspace({
      limit: 20,
      context: 1,
      cwd: workspacePath,
      constraints: '**/*.ts',
      patterns: ['chat', 'settings'],
      classifyDefinitions: true
    });

    expect(finder.multiGrep).toHaveBeenCalledWith({
      smartCase: true,
      pageSize: 20,
      afterContext: 1,
      beforeContext: 1,
      maxFileSize: 2 * 1024 * 1024,
      timeBudgetMs: 2000,
      maxMatchesPerFile: 20,
      patterns: ['chat', 'settings'],
      constraints: '**/*.ts',
      classifyDefinitions: true
    });
    expect(result?.nextCursor).toBeGreaterThan(0);
    expect(result?.matches).toEqual([
      {
        line: 5,
        isDefinition: true,
        path: 'src/main/chat.ts',
        text: 'const chat = true;',
        contextAfter: ['after'],
        contextBefore: ['before']
      }
    ]);

    await multiGrepWorkspace({
      limit: 20,
      cwd: workspacePath,
      cursor: result?.nextCursor ?? 0,
      patterns: ['chat', 'settings']
    });

    expect(finder.multiGrep).toHaveBeenLastCalledWith(
      expect.objectContaining({ cursor: { _offset: 18, __brand: 'GrepCursor' } })
    );
  });

  it('debounces refresh scans against the freshly created index', async () => {
    vi.useFakeTimers();

    try {
      const finder = createFinder({
        destroy: vi.fn(),
        scanFiles: vi.fn(() => okVoid()),
        refreshGitStatus: vi.fn(() => ok(2))
      });
      fffMock.create.mockReturnValue(ok(finder));

      const { disposeWorkspaceFinders, refreshWorkspaceFinder } = await import('@main/search/fff');
      await expect(refreshWorkspaceFinder(workspacePath)).resolves.toBe(true);
      expect(finder.scanFiles).not.toHaveBeenCalled();

      vi.setSystemTime(Date.now() + 61_000);
      await expect(refreshWorkspaceFinder(workspacePath)).resolves.toBe(true);
      expect(finder.scanFiles).toHaveBeenCalledOnce();
      expect(finder.refreshGitStatus).toHaveBeenCalledOnce();

      await expect(refreshWorkspaceFinder(workspacePath)).resolves.toBe(true);
      expect(finder.scanFiles).toHaveBeenCalledOnce();

      disposeWorkspaceFinders();
      expect(finder.destroy).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });

  it('relativizes absolute path constraints inside the workspace and falls back outside it', async () => {
    mkdirSync(path.join(workspacePath, 'src', 'main'), { recursive: true });

    const finder = createFinder({
      grep: vi.fn(() =>
        ok<GrepResult>({
          totalFiles: 1,
          totalMatched: 1,
          filteredFileCount: 1,
          totalFilesSearched: 1,
          nextCursor: null,
          items: [grepMatch('src/main/chat.ts')]
        })
      )
    });
    fffMock.create.mockReturnValue(ok(finder));

    const { grepWorkspace } = await import('@main/search/fff');
    const inside = await grepWorkspace({
      limit: 20,
      pattern: 'chat',
      cwd: workspacePath,
      path: path.join(realpathSync(workspacePath), 'src', 'main')
    });
    const outside = await grepWorkspace({
      limit: 20,
      pattern: 'chat',
      cwd: workspacePath,
      path: path.sep
    });

    expect(finder.grep).toHaveBeenCalledTimes(1);
    expect(finder.grep).toHaveBeenCalledWith('src/main/ chat', expect.anything());
    expect(inside?.matches).toHaveLength(1);
    expect(outside).toBeNull();
  });

  it('caps grep options before calling FFF', async () => {
    const finder = createFinder({});
    fffMock.create.mockReturnValue(ok(finder));

    const { grepWorkspace } = await import('@main/search/fff');
    await grepWorkspace({
      limit: 500,
      context: 99,
      pattern: 'chat',
      cwd: workspacePath
    });

    expect(finder.grep).toHaveBeenCalledWith(
      'chat',
      expect.objectContaining({
        pageSize: 100,
        afterContext: 3,
        beforeContext: 3,
        timeBudgetMs: 2000,
        maxMatchesPerFile: 20
      })
    );
  });
});
