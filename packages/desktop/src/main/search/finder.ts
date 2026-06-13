import { existsSync } from 'node:fs';
import { realpath } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import type { FileFinderApi } from '@ff-labs/fff-node';
import { agentWaitMs } from '@main/search/limits';
import { cleanRelativePath, relativeInside } from '@main/search/path';

const finderLimit = 4;
const finderIdleMs = 15 * 60 * 1000;
const defaultWaitMs = 1000;
const homePath = path.resolve(homedir());

type FffNode = typeof import('@ff-labs/fff-node');

export interface FinderEntry {
  ready: Promise<boolean>;
  finder: FileFinderApi;
  indexRoot: string;
  lastUsedAt: number;
}

interface FinderOptions {
  waitMs?: number;
}

let fffNodePromise: Promise<FffNode | null> | null = null;

const finders = new Map<string, FinderEntry>();
const creatingFinders = new Map<string, Promise<FinderEntry | null>>();

const now = () => Date.now();

export const canonicalPath = async (value: string) => {
  const resolved = path.resolve(value);

  try {
    return await realpath(resolved);
  } catch {
    return resolved;
  }
};

const isIndexablePath = (value: string) => {
  const parsed = path.parse(value);
  return existsSync(value) && value !== parsed.root && value !== homePath;
};

const loadFffNode = async () => {
  if (!fffNodePromise) {
    fffNodePromise = import('@ff-labs/fff-node').catch(() => null);
  }

  return await fffNodePromise;
};

const destroyEntry = (entry: FinderEntry) => {
  try {
    entry.finder.destroy();
  } catch {
    return;
  }
};

const pruneFinders = () => {
  const cutoff = now() - finderIdleMs;

  for (const [indexRoot, entry] of finders) {
    if (entry.lastUsedAt >= cutoff) continue;
    destroyEntry(entry);
    finders.delete(indexRoot);
  }

  while (finders.size > finderLimit) {
    const oldest = [...finders.entries()].sort((first, second) => first[1].lastUsedAt - second[1].lastUsedAt)[0];
    if (!oldest) return;
    destroyEntry(oldest[1]);
    finders.delete(oldest[0]);
  }
};

const createFinderEntry = async (indexRoot: string): Promise<FinderEntry | null> => {
  const fff = await loadFffNode();
  if (!fff) return null;

  const result = await Promise.resolve()
    .then(() => fff.FileFinder.create({ basePath: indexRoot, aiMode: true }))
    .catch(() => null);
  if (!result?.ok) return null;

  const finder = result.value;
  return {
    finder,
    indexRoot,
    lastUsedAt: now(),
    ready: finder
      .waitForIndexReady(agentWaitMs)
      .then((ready) => (ready.ok ? ready.value : false))
      .catch(() => false)
  };
};

const waitForReady = async (entry: FinderEntry, waitMs: number) => {
  if (waitMs <= 0) return true;

  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      entry.ready,
      new Promise<boolean>((resolve) => {
        timeoutId = setTimeout(() => resolve(false), waitMs);
      })
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

export const workspaceFinder = async (workspaceRoot: string, options: FinderOptions = {}) => {
  pruneFinders();

  if (!isIndexablePath(workspaceRoot)) return null;

  const indexRoot = await canonicalPath(workspaceRoot);
  if (!isIndexablePath(indexRoot)) return null;

  let entry = finders.get(indexRoot);

  if (!entry) {
    let entryPromise = creatingFinders.get(indexRoot);
    if (!entryPromise) {
      entryPromise = createFinderEntry(indexRoot);
      creatingFinders.set(indexRoot, entryPromise);
    }

    const nextEntry = await entryPromise;
    if (creatingFinders.get(indexRoot) === entryPromise) creatingFinders.delete(indexRoot);
    if (!nextEntry) return null;
    entry = finders.get(indexRoot) ?? nextEntry;
    if (entry === nextEntry) finders.set(indexRoot, nextEntry);
  }

  const waitMs = options.waitMs ?? defaultWaitMs;
  entry.lastUsedAt = now();

  const ready = await waitForReady(entry, waitMs);
  if (waitMs > 0 && !ready) return null;

  return entry;
};

export const absoluteFromIndex = (entry: FinderEntry, relativePath: string) => path.join(entry.indexRoot, relativePath);

export const relativeToWorkspace = (entry: FinderEntry, workspaceRoot: string, relativePath: string) =>
  relativeInside(workspaceRoot, absoluteFromIndex(entry, relativePath));

export const relativeToIndex = (entry: FinderEntry, workspaceRoot: string, relativePath = '') => {
  const workspacePrefix = relativeInside(entry.indexRoot, workspaceRoot);
  if (workspacePrefix === null) return null;

  const itemPath = cleanRelativePath(relativePath);
  if (!workspacePrefix) return itemPath;
  return itemPath ? `${workspacePrefix}/${itemPath}` : workspacePrefix;
};

export const warmWorkspaceFinder = (workspaceRoot: string) => {
  workspaceFinder(workspaceRoot, { waitMs: 0 }).catch(() => {});
};

export const refreshWorkspaceFinder = async (workspaceRoot: string): Promise<boolean> => {
  const root = await canonicalPath(workspaceRoot);
  const entry = await workspaceFinder(root, { waitMs: 0 });
  if (!entry) return false;

  const scan = entry.finder.scanFiles();
  const git = entry.finder.refreshGitStatus();
  return scan.ok && git.ok;
};

export const disposeWorkspaceFinders = () => {
  for (const entry of finders.values()) destroyEntry(entry);
  finders.clear();
  creatingFinders.clear();
};
