import { statSync } from 'node:fs';
import type { GrepCursor, GrepOptions, GrepResult, MixedItem, SearchOptions } from '@ff-labs/fff-node';
import {
  absoluteFromIndex,
  disposeWorkspaceFinders,
  type FinderEntry,
  refreshWorkspaceFinder,
  relativeToWorkspace,
  warmWorkspaceFinder,
  workspaceFinder
} from '@main/search/finder';
import {
  agentWaitMs,
  boundedContext,
  boundedCount,
  grepTimeBudgetMs,
  maxFindPageSize,
  maxGrepFileSize,
  maxGrepPageSize,
  maxMatchesPerFile,
  uiWaitMs
} from '@main/search/limits';
import { hasGlobChars, workspaceRelativePath } from '@main/search/path';
import type {
  FindOptions,
  GrepOptionsInput,
  MultiGrepOptionsInput,
  PathSearchOptions,
  WorkspaceGrepResult,
  WorkspacePathMatch
} from '@main/search/types';

export type { WorkspaceGrepMatch, WorkspaceGrepResult, WorkspacePathMatch } from '@main/search/types';
export { disposeWorkspaceFinders, refreshWorkspaceFinder, warmWorkspaceFinder };

const maxStoredCursors = 64;

const isInsideFolder = (itemPath: string, folderPath = '') =>
  !folderPath || itemPath === folderPath || itemPath.startsWith(`${folderPath}/`);

const mixedPath = (item: MixedItem) => item.item.relativePath;

const mixedType = (item: MixedItem): WorkspacePathMatch['type'] => (item.type === 'directory' ? 'directory' : 'file');

const uniquePaths = (items: WorkspacePathMatch[], limit: number) => {
  const seen = new Set<string>();
  const results: WorkspacePathMatch[] = [];

  for (const item of items) {
    if (!item.path || seen.has(item.path)) continue;
    seen.add(item.path);
    results.push(item);
    if (results.length >= limit) break;
  }

  return results;
};

const pathQuery = (query: string, folderPath = '') => {
  const cleanQuery = query.trim();
  if (!folderPath) return cleanQuery;
  return `${folderPath}/ ${cleanQuery}`.trim();
};

const searchOptions = (limit: number): SearchOptions => ({
  pageSize: boundedCount(limit, maxFindPageSize)
});

const globPattern = (pattern: string, folderPath: string) => {
  if (!folderPath) return pattern;
  return `${folderPath.replace(/\/+$/u, '')}/${pattern}`;
};

const constraintPath = (entry: FinderEntry, relativePath = '') => {
  if (!relativePath) return '';

  try {
    return statSync(absoluteFromIndex(entry, relativePath)).isDirectory() ? `${relativePath}/` : relativePath;
  } catch {
    return relativePath;
  }
};

const grepQuery = (pattern: string, pathConstraint = '', globConstraint = '') =>
  [pathConstraint.trim(), globConstraint.trim(), pattern].filter(Boolean).join(' ');

let lastCursorToken = 0;

const storedCursors = new Map<number, GrepCursor>();

const storeCursor = (cursor: GrepCursor | null): number => {
  if (!cursor) return 0;

  lastCursorToken += 1;
  storedCursors.set(lastCursorToken, cursor);

  while (storedCursors.size > maxStoredCursors) {
    const oldest = storedCursors.keys().next().value;
    if (oldest === undefined) break;
    storedCursors.delete(oldest);
  }

  return lastCursorToken;
};

const storedCursor = (token?: number): GrepCursor | null => (token ? (storedCursors.get(token) ?? null) : null);

const grepOptions = (
  {
    mode,
    limit,
    context,
    classifyDefinitions
  }: Pick<GrepOptionsInput, 'classifyDefinitions' | 'context' | 'limit' | 'mode'>,
  cursor: GrepCursor | null
): GrepOptions => ({
  ...(cursor ? { cursor } : {}),
  mode: mode ?? 'plain',
  smartCase: true,
  maxFileSize: maxGrepFileSize,
  timeBudgetMs: grepTimeBudgetMs,
  maxMatchesPerFile,
  pageSize: boundedCount(limit, maxGrepPageSize),
  beforeContext: boundedContext(context),
  afterContext: boundedContext(context),
  classifyDefinitions: Boolean(classifyDefinitions)
});

const workspaceGrepResult = (entry: FinderEntry, result: GrepResult, restarted: boolean): WorkspaceGrepResult => ({
  matches: result.items.flatMap((match) => {
    const itemPath = relativeToWorkspace(entry, match.relativePath);
    if (!itemPath) return [];
    return [
      {
        line: match.lineNumber,
        path: itemPath,
        text: match.lineContent,
        contextAfter: match.contextAfter ?? [],
        contextBefore: match.contextBefore ?? [],
        isDefinition: Boolean(match.isDefinition)
      }
    ];
  }),
  totalFiles: result.totalFiles,
  nextCursor: storeCursor(result.nextCursor),
  ...(restarted ? { restarted: true } : {}),
  searchedFiles: result.totalFilesSearched
});

export const searchWorkspacePaths = async ({
  query,
  limit,
  folderPath,
  workspaceRoot,
  waitMs = uiWaitMs
}: PathSearchOptions): Promise<WorkspacePathMatch[] | null> => {
  const entry = await workspaceFinder(workspaceRoot, { waitMs });
  if (!entry) return null;

  const cleanFolder = workspaceRelativePath(entry.indexRoot, folderPath);
  if (cleanFolder === null) return null;

  const resultLimit = boundedCount(limit, maxFindPageSize);
  const result = entry.finder.mixedSearch(pathQuery(query, cleanFolder), {
    pageSize: boundedCount(Math.max(resultLimit * 4, 200), maxFindPageSize)
  });
  if (!result.ok) return null;

  return uniquePaths(
    result.value.items.flatMap((item) => {
      const itemPath = relativeToWorkspace(entry, mixedPath(item));
      if (!itemPath || !isInsideFolder(itemPath, cleanFolder) || itemPath === cleanFolder) return [];
      return [{ path: itemPath, type: mixedType(item) }];
    }),
    resultLimit
  );
};

export const findWorkspacePaths = async ({
  cwd,
  path: searchPath,
  limit,
  pattern,
  waitMs = agentWaitMs
}: FindOptions): Promise<WorkspacePathMatch[] | null> => {
  const entry = await workspaceFinder(cwd, { waitMs });
  if (!entry) return null;

  const folderPath = workspaceRelativePath(entry.indexRoot, searchPath);
  if (folderPath === null) return null;

  const resultLimit = boundedCount(limit, maxFindPageSize);
  const result = hasGlobChars(pattern)
    ? entry.finder.glob(globPattern(pattern, folderPath), searchOptions(resultLimit))
    : entry.finder.fileSearch(pathQuery(pattern, folderPath), searchOptions(resultLimit));
  if (!result.ok) return null;

  return uniquePaths(
    result.value.items.flatMap((item) => {
      const itemPath = relativeToWorkspace(entry, item.relativePath);
      if (!itemPath || !isInsideFolder(itemPath, folderPath)) return [];
      return [{ path: itemPath, type: 'file' as const }];
    }),
    resultLimit
  );
};

export const grepWorkspace = async (options: GrepOptionsInput): Promise<WorkspaceGrepResult | null> => {
  const entry = await workspaceFinder(options.cwd, { waitMs: options.waitMs ?? agentWaitMs });
  if (!entry) return null;

  const searchPath = workspaceRelativePath(entry.indexRoot, options.path);
  if (searchPath === null) return null;

  const cursor = storedCursor(options.cursor);
  const restarted = Boolean(options.cursor) && !cursor;
  const result = entry.finder.grep(
    grepQuery(options.pattern, constraintPath(entry, searchPath), options.glob),
    grepOptions(options, cursor)
  );
  if (!result.ok) return null;
  return workspaceGrepResult(entry, result.value, restarted);
};

export const multiGrepWorkspace = async ({
  cwd,
  limit,
  cursor,
  context,
  patterns,
  constraints,
  waitMs = agentWaitMs,
  classifyDefinitions
}: MultiGrepOptionsInput): Promise<WorkspaceGrepResult | null> => {
  const entry = await workspaceFinder(cwd, { waitMs });
  if (!entry) return null;

  const storedGrepCursor = storedCursor(cursor);
  const restarted = Boolean(cursor) && !storedGrepCursor;
  const result = entry.finder.multiGrep({
    patterns,
    ...(storedGrepCursor ? { cursor: storedGrepCursor } : {}),
    ...(constraints ? { constraints } : {}),
    smartCase: true,
    maxFileSize: maxGrepFileSize,
    timeBudgetMs: grepTimeBudgetMs,
    maxMatchesPerFile,
    pageSize: boundedCount(limit, maxGrepPageSize),
    beforeContext: boundedContext(context),
    afterContext: boundedContext(context),
    classifyDefinitions: Boolean(classifyDefinitions)
  });

  if (!result.ok) return null;
  return workspaceGrepResult(entry, result.value, restarted);
};
