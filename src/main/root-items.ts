import { readdir, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';

export type RootItem = {
  name: string;
  path: string;
  type: 'directory' | 'file';
};

export type RootItemsScope = 'root' | 'workspace';

type RootItemsCacheEntry = {
  expiresAt: number;
  items?: RootItem[];
  promise?: Promise<RootItem[]>;
};

const rootItemsCache = new Map<string, RootItemsCacheEntry>();
const rootItemsCacheMs = 3000;
const workspaceRoot = process.cwd();
const filesystemRoot = homedir();

const readRootItems = async (relativePath: string, scope: RootItemsScope) => {
  const basePath = scope === 'root' ? filesystemRoot : workspaceRoot;
  const normalizedPath = path.normalize(relativePath || '.');
  const targetPath = path.resolve(basePath, normalizedPath);
  const relativeTarget = path.relative(basePath, targetPath);

  if (relativeTarget.startsWith('..') || path.isAbsolute(relativeTarget)) return [];

  const entries = await readdir(targetPath, { withFileTypes: true });
  const items = await Promise.all(
    entries
      .filter((entry) => !entry.name.startsWith('.'))
      .map(async (entry) => {
        const entryPath = path.join(targetPath, entry.name);
        const entryStat = entry.isSymbolicLink() ? await stat(entryPath).catch(() => undefined) : undefined;
        const isDirectory = entry.isDirectory() || entryStat?.isDirectory();
        const isFile = entry.isFile() || entryStat?.isFile();

        if (!isDirectory && !isFile) return undefined;

        return {
          name: entry.name,
          path: path.posix.join(relativeTarget.split(path.sep).join('/'), entry.name),
          type: isDirectory ? 'directory' : 'file'
        } satisfies RootItem;
      })
  );

  return items
    .filter((item): item is RootItem => Boolean(item))
    .sort((first, second) => {
      if (first.type !== second.type) return first.type === 'directory' ? -1 : 1;
      return first.name.localeCompare(second.name, undefined, { sensitivity: 'base' });
    });
};

export const listRootItems = async (relativePath: string, scope: RootItemsScope) => {
  const cacheKey = `${scope}:${relativePath || ''}`;
  const cached = rootItemsCache.get(cacheKey);
  const now = Date.now();

  if (cached?.items && cached.expiresAt > now) return cached.items;
  if (cached?.promise) return cached.promise;

  const promise = readRootItems(relativePath, scope)
    .then((items) => {
      rootItemsCache.set(cacheKey, { expiresAt: Date.now() + rootItemsCacheMs, items });
      return items;
    })
    .catch((error) => {
      rootItemsCache.delete(cacheKey);
      throw error;
    });

  rootItemsCache.set(cacheKey, { expiresAt: now + rootItemsCacheMs, promise });
  return promise;
};
