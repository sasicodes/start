import { spawn } from 'node:child_process';
import { readdir, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';

export type RootItem = {
  name: string;
  path: string;
  description?: string;
  type: 'directory' | 'file';
};

export type RootItemsScope = 'root' | 'workspace';

type RootItemsCacheEntry = {
  expiresAt: number;
  items?: RootItem[];
  promise?: Promise<RootItem[]>;
};

type ScoredRootItem = {
  item: RootItem;
  score: number;
};

const rootItemsCache = new Map<string, RootItemsCacheEntry>();
const rootItemsCacheMaxEntries = 80;
const rootItemsCacheMs = 3000;
const rootItemsLimit = 80;
const gitCommandTimeoutMs = 8000;
const workspaceSearchLimit = 120;
const filesystemRoot = homedir();
const ignoredDirectoryNames = new Set(['.git', 'node_modules']);

const pruneCache = (cache: Map<string, RootItemsCacheEntry>, now = Date.now()) => {
  for (const [key, entry] of cache) {
    if (!entry.promise && entry.expiresAt <= now) cache.delete(key);
  }

  while (cache.size > rootItemsCacheMaxEntries) {
    const key = cache.keys().next().value;
    if (!key) return;
    cache.delete(key);
  }
};

const toPosixPath = (value: string) => value.split(path.sep).join('/').replace(/\/+/gu, '/');

const cleanRelativePath = (value: string) =>
  toPosixPath(path.normalize(value || '.'))
    .replace(/^\.(?:\/|$)/u, '')
    .replace(/^\/+/u, '')
    .replace(/\/+$|^\.$/gu, '');

const hasIgnoredSegment = (value: string) => value.split('/').some((segment) => ignoredDirectoryNames.has(segment));

const itemName = (itemPath: string) => itemPath.split('/').filter(Boolean).at(-1) ?? itemPath;

const itemSort = (first: RootItem, second: RootItem) => {
  if (first.type !== second.type) return first.type === 'directory' ? -1 : 1;
  return first.path.localeCompare(second.path, undefined, { sensitivity: 'base' });
};

const rootItem = (itemPath: string, type: RootItem['type']): RootItem => ({
  name: itemName(itemPath),
  path: itemPath,
  ...(itemName(itemPath) !== itemPath ? { description: itemPath } : {}),
  type
});

const queryPath = (relativePath: string) => {
  const hasTrailingSlash = /[\\/]$/u.test(relativePath);
  const normalizedPath = cleanRelativePath(relativePath);
  return hasTrailingSlash && normalizedPath ? `${normalizedPath}/` : normalizedPath;
};

const splitScopedQuery = (relativePath: string) => {
  const normalizedPath = queryPath(relativePath);
  const slashIndex = normalizedPath.lastIndexOf('/');

  if (slashIndex === -1) return { folderPath: '', query: normalizedPath };

  return {
    folderPath: normalizedPath.slice(0, slashIndex),
    query: normalizedPath.slice(slashIndex + 1)
  };
};

const gitPathspec = (folderPath: string) => (folderPath ? `${folderPath}/` : '');

const runGitPathStream = async (basePath: string, folderPath: string, onPath: (itemPath: string) => void) =>
  await new Promise<boolean>((resolve) => {
    const args = ['-C', basePath, 'ls-files', '--cached', '--others', '--exclude-standard', '-z'];
    const pathspec = gitPathspec(folderPath);
    if (pathspec) args.push('--', pathspec);

    const child = spawn('git', args, { stdio: ['ignore', 'pipe', 'ignore'] });
    let pending = '';
    let settled = false;

    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve(ok);
    };

    const processOutput = (output: string) => {
      if (settled) return;

      const parts = output.split('\0');
      pending = parts.pop() ?? '';

      for (const part of parts) {
        const itemPath = cleanRelativePath(part);
        if (itemPath && !hasIgnoredSegment(itemPath)) onPath(itemPath);
      }
    };

    const timeout = setTimeout(() => {
      child.kill('SIGKILL');
      finish(false);
    }, gitCommandTimeoutMs);

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => processOutput(pending + chunk));
    child.on('error', () => finish(false));
    child.on('close', (code) => {
      if (settled) return;

      if (pending) {
        const itemPath = cleanRelativePath(pending);
        if (itemPath && !hasIgnoredSegment(itemPath)) onPath(itemPath);
      }
      finish(code === 0);
    });
  });

const runGitCheckIgnore = async (basePath: string, itemPaths: string[]) => {
  if (itemPaths.length === 0) return new Set<string>();

  return await new Promise<Set<string>>((resolve) => {
    const child = spawn('git', ['-C', basePath, 'check-ignore', '-z', '--stdin'], {
      stdio: ['pipe', 'pipe', 'ignore']
    });
    const chunks: string[] = [];
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve(new Set(chunks.join('').split('\0').filter(Boolean).map(cleanRelativePath)));
    };

    const timeout = setTimeout(() => {
      child.kill('SIGKILL');
      finish();
    }, gitCommandTimeoutMs);

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => chunks.push(chunk));
    child.stdin.on('error', () => {});
    child.on('error', finish);
    child.on('close', finish);
    child.stdin.end(`${itemPaths.join('\0')}\0`);
  });
};

const filterGitIgnoredItems = async (basePath: string, items: RootItem[]) => {
  const ignoredPaths = await runGitCheckIgnore(
    basePath,
    items.filter((item) => !hasIgnoredSegment(item.path)).map((item) => item.path)
  );

  return items.filter((item) => !ignoredPaths.has(item.path));
};

const isInsideFolder = (itemPath: string, folderPath: string) =>
  !folderPath || itemPath === folderPath || itemPath.startsWith(`${folderPath}/`);

const relativeToFolder = (itemPath: string, folderPath: string) =>
  folderPath ? itemPath.slice(folderPath.length).replace(/^\//u, '') : itemPath;

const addDirectChild = (items: Map<string, RootItem>, itemPath: string, folderPath: string) => {
  if (!isInsideFolder(itemPath, folderPath) || itemPath === folderPath) return;

  const relativePath = relativeToFolder(itemPath, folderPath);
  const [name, ...rest] = relativePath.split('/');
  if (!name) return;

  const childPath = folderPath ? `${folderPath}/${name}` : name;
  const type = rest.length > 0 ? 'directory' : 'file';
  const current = items.get(childPath);
  if (current?.type === 'directory') return;

  items.set(childPath, rootItem(childPath, type));
};

const directWorkspaceItems = async (folderPath: string, workspaceRoot: string) => {
  const items = new Map<string, RootItem>();
  const ok = await runGitPathStream(workspaceRoot, folderPath, (itemPath) =>
    addDirectChild(items, itemPath, folderPath)
  );
  if (!ok) return;

  const fileSystemItems = await safeReadDirectoryItems(folderPath, workspaceRoot);
  for (const item of await filterGitIgnoredItems(workspaceRoot, fileSystemItems)) {
    if (!items.has(item.path)) items.set(item.path, item);
  }

  return [...items.values()].sort(itemSort).slice(0, rootItemsLimit);
};

const scoreEntry = (entry: RootItem, query: string) => {
  const lowerName = entry.name.toLowerCase();
  const lowerPath = entry.path.toLowerCase();
  const lowerQuery = query.toLowerCase();
  let score = 0;

  if (lowerName === lowerQuery) score = 100;
  else if (lowerName.startsWith(lowerQuery)) score = 80;
  else if (lowerName.includes(lowerQuery)) score = 50;
  else if (lowerPath.includes(lowerQuery)) score = 30;

  return entry.type === 'directory' && score > 0 ? score + 10 : score;
};

const addSearchCandidate = (
  items: Map<string, ScoredRootItem>,
  itemPath: string,
  type: RootItem['type'],
  query: string
) => {
  const item = rootItem(itemPath, type);
  const score = scoreEntry(item, query);
  const current = items.get(itemPath);
  if (score <= 0 || (current && current.score >= score)) return;

  items.set(itemPath, { item, score });
};

const addSearchPath = (items: Map<string, ScoredRootItem>, itemPath: string, folderPath: string, query: string) => {
  if (!isInsideFolder(itemPath, folderPath) || itemPath === folderPath) return;

  const relativePath = relativeToFolder(itemPath, folderPath);
  const segments = relativePath.split('/').filter(Boolean);
  let directoryPath = folderPath;

  for (const segment of segments.slice(0, -1)) {
    directoryPath = directoryPath ? `${directoryPath}/${segment}` : segment;
    addSearchCandidate(items, directoryPath, 'directory', query);
  }

  addSearchCandidate(items, itemPath, 'file', query);
};

const searchWorkspaceItems = async (folderPath: string, query: string, workspaceRoot: string) => {
  const items = new Map<string, ScoredRootItem>();
  const ok = await runGitPathStream(workspaceRoot, folderPath, (itemPath) =>
    addSearchPath(items, itemPath, folderPath, query)
  );
  if (!ok) return;

  return [...items.values()]
    .sort((first, second) => second.score - first.score || itemSort(first.item, second.item))
    .slice(0, workspaceSearchLimit)
    .map(({ item }) => item);
};

const listWorkspaceItems = async (relativePath: string, workspaceRoot: string) => {
  const { folderPath, query } = splitScopedQuery(relativePath);
  const items = query
    ? await searchWorkspaceItems(folderPath, query, workspaceRoot)
    : await directWorkspaceItems(folderPath, workspaceRoot);

  if (items) return items;

  return listDirectoryItems(relativePath, workspaceRoot);
};

const readDirectoryItems = async (relativePath: string, basePath: string) => {
  const normalizedPath = path.normalize(relativePath || '.');
  const targetPath = path.resolve(basePath, normalizedPath);
  const relativeTarget = path.relative(basePath, targetPath);

  if (relativeTarget.startsWith('..') || path.isAbsolute(relativeTarget)) return [];

  const entries = await readdir(targetPath, { withFileTypes: true });
  const items = await Promise.all(
    entries.map(async (entry) => {
      if (ignoredDirectoryNames.has(entry.name)) return;

      const entryPath = path.join(targetPath, entry.name);
      let entryStat: Awaited<ReturnType<typeof stat>> | undefined;
      if (entry.isSymbolicLink()) {
        try {
          entryStat = await stat(entryPath);
        } catch {}
      }
      const isDirectory = entry.isDirectory() || entryStat?.isDirectory();
      const isFile = entry.isFile() || entryStat?.isFile();

      if (!isDirectory && !isFile) return;

      const itemPath = cleanRelativePath(path.posix.join(toPosixPath(relativeTarget), entry.name));
      if (!itemPath || hasIgnoredSegment(itemPath)) return;

      return rootItem(itemPath, isDirectory ? 'directory' : 'file');
    })
  );

  return items
    .filter((item): item is RootItem => Boolean(item))
    .sort(itemSort)
    .slice(0, rootItemsLimit);
};

const safeReadDirectoryItems = async (relativePath: string, basePath: string) => {
  try {
    return await readDirectoryItems(relativePath, basePath);
  } catch {
    return [];
  }
};

const listDirectoryItems = async (relativePath: string, basePath: string) => {
  const { folderPath, query } = splitScopedQuery(relativePath);
  const items = await safeReadDirectoryItems(folderPath, basePath);
  if (!query) return items;

  const lowerQuery = query.toLowerCase();
  return items.filter((item) => item.name.toLowerCase().includes(lowerQuery));
};

const readRootItems = async (relativePath: string, scope: RootItemsScope, workspaceRoot: string) => {
  const basePath = scope === 'root' ? filesystemRoot : workspaceRoot;
  return scope === 'workspace'
    ? listWorkspaceItems(relativePath, basePath)
    : listDirectoryItems(relativePath, basePath);
};

export const listRootItems = async (relativePath: string, scope: RootItemsScope, workspaceRoot = process.cwd()) => {
  const cacheKey = `${scope}:${workspaceRoot}:${relativePath || ''}`;
  const cached = rootItemsCache.get(cacheKey);
  const now = Date.now();
  pruneCache(rootItemsCache, now);

  if (cached?.items && cached.expiresAt > now) return cached.items;
  if (cached?.promise) return cached.promise;

  const promise = readRootItems(relativePath, scope, workspaceRoot)
    .then((items) => {
      rootItemsCache.set(cacheKey, { expiresAt: Date.now() + rootItemsCacheMs, items });
      pruneCache(rootItemsCache);
      return items;
    })
    .catch((error) => {
      rootItemsCache.delete(cacheKey);
      throw error;
    });

  rootItemsCache.set(cacheKey, { expiresAt: now + rootItemsCacheMs, promise });
  return promise;
};
