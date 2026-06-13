import { statSync } from 'node:fs';
import type { GrepCursor, GrepOptions, GrepResult, MixedItem, SearchOptions } from '@ff-labs/fff-node';
import {
  absoluteFromIndex,
  canonicalPath,
  disposeWorkspaceFinders,
  refreshWorkspaceFinder,
  relativeToIndex,
  relativeToWorkspace,
  warmWorkspaceFinder,
  workspaceFinder,
  type FinderEntry
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
import { cleanRelativePath } from '@main/search/path';
import type {
  FindOptions,
  GrepOptionsInput,
  MultiGrepOptionsInput,
  PathSearchOptions,
  WorkspaceGrepResult,
  WorkspacePathMatch
} from '@main/search/types';

export { disposeWorkspaceFinders, refreshWorkspaceFinder, warmWorkspaceFinder };
export type { WorkspaceGrepMatch, WorkspaceGrepResult, WorkspacePathMatch } from '@main/search/types';

const hasGlob = (value: string) => /[*?[{\]}]/u.test(value);

const cleanConstraint = (value = '') => cleanRelativePath(value);

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
  const cleanFolder = cleanConstraint(folderPath);
  const cleanQuery = query.trim();
  if (!cleanFolder) return cleanQuery;
  return `${cleanFolder}/ ${cleanQuery}`.trim();
};

const searchOptions = (limit: number): SearchOptions => ({
  pageSize: boundedCount(limit, maxFindPageSize)
});

const globPattern = (pattern: string, folderPath: string) => {
  if (!folderPath) return pattern;
  return `${folderPath.replace(/\/+$/u, '')}/${pattern}`;
};

const constraintPath = (entry: FinderEntry, relativePath = '') => {
  const cleanPath = cleanConstraint(relativePath);
  if (!cleanPath) return '';

  try {
    return statSync(absoluteFromIndex(entry, cleanPath)).isDirectory() ? `${cleanPath}/` : cleanPath;
  } catch {
    return cleanPath;
  }
};

const grepQuery = (pattern: string, pathConstraint = '', globConstraint = '') =>
  [pathConstraint.trim(), globConstraint.trim(), pattern].filter(Boolean).join(' ');

const grepCursor = (cursor?: number): GrepCursor | null => {
  if (!cursor || cursor < 0) return null;
  return { _offset: Math.floor(cursor), __brand: 'GrepCursor' } as GrepCursor;
};

const cursorValue = (cursor: GrepCursor | null) => {
  if (!cursor) return 0;
  const value = (cursor as { _offset?: unknown })._offset;
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
};

const grepOptions = ({
  mode,
  limit,
  cursor,
  context,
  classifyDefinitions
}: Pick<GrepOptionsInput, 'classifyDefinitions' | 'context' | 'cursor' | 'limit' | 'mode'>): GrepOptions => {
  const nextCursor = grepCursor(cursor);

  return {
    ...(nextCursor ? { cursor: nextCursor } : {}),
    mode: mode ?? 'plain',
    smartCase: true,
    maxFileSize: maxGrepFileSize,
    timeBudgetMs: grepTimeBudgetMs,
    maxMatchesPerFile,
    pageSize: boundedCount(limit, maxGrepPageSize),
    beforeContext: boundedContext(context),
    afterContext: boundedContext(context),
    classifyDefinitions: Boolean(classifyDefinitions)
  };
};

const workspaceGrepResult = (entry: FinderEntry, cwd: string, result: GrepResult): WorkspaceGrepResult => ({
  matches: result.items.flatMap((match) => {
    const itemPath = relativeToWorkspace(entry, cwd, match.relativePath);
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
  nextCursor: cursorValue(result.nextCursor),
  searchedFiles: result.totalFilesSearched
});

export const searchWorkspacePaths = async ({
  query,
  limit,
  folderPath,
  workspaceRoot,
  waitMs = uiWaitMs
}: PathSearchOptions): Promise<WorkspacePathMatch[] | null> => {
  const root = await canonicalPath(workspaceRoot);
  const entry = await workspaceFinder(root, { waitMs });
  if (!entry) return null;

  const cleanFolder = cleanConstraint(folderPath);
  const indexFolder = relativeToIndex(entry, root, cleanFolder);
  if (indexFolder === null) return null;

  const resultLimit = boundedCount(limit, maxFindPageSize);
  const result = entry.finder.mixedSearch(pathQuery(query, indexFolder), {
    pageSize: boundedCount(Math.max(resultLimit * 4, 200), maxFindPageSize)
  });
  if (!result.ok) return null;

  return uniquePaths(
    result.value.items.flatMap((item) => {
      const itemPath = relativeToWorkspace(entry, root, mixedPath(item));
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
  const root = await canonicalPath(cwd);
  const entry = await workspaceFinder(root, { waitMs });
  if (!entry) return null;

  const folderPath = cleanConstraint(searchPath);
  const indexFolder = relativeToIndex(entry, root, folderPath);
  if (indexFolder === null) return null;

  const resultLimit = boundedCount(limit, maxFindPageSize);
  const result = hasGlob(pattern)
    ? entry.finder.glob(globPattern(pattern, indexFolder), searchOptions(resultLimit))
    : entry.finder.fileSearch(pathQuery(pattern, indexFolder), searchOptions(resultLimit));
  if (!result.ok) return null;

  return uniquePaths(
    result.value.items.flatMap((item) => {
      const itemPath = relativeToWorkspace(entry, root, item.relativePath);
      if (!itemPath || !isInsideFolder(itemPath, folderPath)) return [];
      return [{ path: itemPath, type: 'file' as const }];
    }),
    resultLimit
  );
};

export const grepWorkspace = async (options: GrepOptionsInput): Promise<WorkspaceGrepResult | null> => {
  const root = await canonicalPath(options.cwd);
  const entry = await workspaceFinder(root, { waitMs: options.waitMs ?? agentWaitMs });
  if (!entry) return null;

  const indexPath = relativeToIndex(entry, root, options.path);
  if (indexPath === null) return null;

  const result = entry.finder.grep(
    grepQuery(options.pattern, constraintPath(entry, indexPath), options.glob),
    grepOptions(options)
  );
  if (!result.ok) return null;
  return workspaceGrepResult(entry, root, result.value);
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
  const root = await canonicalPath(cwd);
  const entry = await workspaceFinder(root, { waitMs });
  if (!entry) return null;

  const indexPath = relativeToIndex(entry, root);
  if (indexPath === null) return null;

  const nextCursor = grepCursor(cursor);
  const searchConstraints = [constraintPath(entry, indexPath), constraints].filter(Boolean).join(' ');
  const result = entry.finder.multiGrep({
    patterns,
    ...(nextCursor ? { cursor: nextCursor } : {}),
    ...(searchConstraints ? { constraints: searchConstraints } : {}),
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
  return workspaceGrepResult(entry, root, result.value);
};
