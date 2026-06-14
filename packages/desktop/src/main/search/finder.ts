import { existsSync } from 'node:fs';
import { realpath } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import type { FileFinderApi } from '@ff-labs/fff-node';
import { uiWaitMs } from '@main/search/limits';
import { relativeInside } from '@main/search/path';
import { logger } from '@main/utils/logger';

const finderLimit = 4;
const defaultWaitMs = 1000;
const refreshIntervalMs = 60 * 1000;
const readyPollMs = 10 * 60 * 1000;
const finderIdleMs = 15 * 60 * 1000;
const homePath = path.resolve(homedir());

type FffNode = typeof import('@ff-labs/fff-node');

export interface FinderEntry {
  ready: boolean;
  indexRoot: string;
  lastUsedAt: number;
  finder: FileFinderApi;
  lastRefreshAt: number;
}

interface FinderOptions {
  waitMs?: number;
}

let fffNodePromise: Promise<FffNode | null> | null = null;

const finders = new Map<string, FinderEntry>();
const creatingFinders = new Map<string, Promise<FinderEntry | null>>();

const now = () => Date.now();

const canonicalPath = async (value: string) => {
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
    fffNodePromise = import('@ff-labs/fff-node').catch((error) => {
      logger.error('fff load', error);
      return null;
    });
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

const markReady = async (entry: FinderEntry, timeoutMs: number) => {
  if (entry.ready) return true;

  try {
    const result = await entry.finder.waitForIndexReady(timeoutMs);
    if (result.ok && result.value) entry.ready = true;
  } catch {
    return false;
  }

  return entry.ready;
};

const indexReady = async (entry: FinderEntry, waitMs: number) => {
  if (entry.ready) return true;
  if (waitMs <= uiWaitMs && entry.finder.isScanning()) return false;
  return markReady(entry, waitMs);
};

const createFinderEntry = async (indexRoot: string): Promise<FinderEntry | null> => {
  const fff = await loadFffNode();
  if (!fff) return null;

  let result: ReturnType<typeof fff.FileFinder.create> | null = null;
  try {
    result = fff.FileFinder.create({ basePath: indexRoot, aiMode: true });
  } catch {
    return null;
  }
  if (!result.ok) return null;

  const entry: FinderEntry = {
    indexRoot,
    ready: false,
    lastUsedAt: now(),
    lastRefreshAt: now(),
    finder: result.value
  };
  markReady(entry, readyPollMs);
  return entry;
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

  if (waitMs > 0 && !(await indexReady(entry, waitMs))) return null;

  return entry;
};

export const absoluteFromIndex = (entry: FinderEntry, relativePath: string) => path.join(entry.indexRoot, relativePath);

export const relativeToWorkspace = (entry: FinderEntry, relativePath: string) =>
  relativeInside(entry.indexRoot, absoluteFromIndex(entry, relativePath));

export const warmWorkspaceFinder = (workspaceRoot: string) => {
  workspaceFinder(workspaceRoot, { waitMs: 0 }).catch(() => {});
};

export const refreshWorkspaceFinder = async (workspaceRoot: string): Promise<boolean> => {
  const entry = await workspaceFinder(workspaceRoot, { waitMs: 0 });
  if (!entry) return false;
  if (now() - entry.lastRefreshAt < refreshIntervalMs) return true;

  entry.lastRefreshAt = now();
  const scan = entry.finder.scanFiles();
  const git = entry.finder.refreshGitStatus();
  return scan.ok && git.ok;
};

export const disposeWorkspaceFinders = () => {
  for (const entry of finders.values()) destroyEntry(entry);
  finders.clear();
  creatingFinders.clear();
};
