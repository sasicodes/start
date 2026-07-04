import { existsSync } from 'node:fs';
import { realpath } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import type { FileFinderApi } from '@ff-labs/fff-node';
import { uiWaitMs } from '@main/search/limits';
import { relativeInside } from '@main/search/path';
import { logger } from '@main/utils/logger';

const finderLimit = 4;
const defaultWaitMs = 1000;
const readyProbeMs = 50;
const idlePruneMs = 60 * 1000;
const refreshIntervalMs = 60 * 1000;
const maxReadyWatchDelayMs = 2000;
const finderIdleMs = 15 * 60 * 1000;
const initialReadyWatchDelayMs = 250;
const readyWatchBudgetMs = 2 * 60 * 1000;
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

let pruneTimer: NodeJS.Timeout | null = null;
let fffNodePromise: Promise<FffNode | null> | null = null;

const finders = new Map<string, FinderEntry>();
const loggedCreateErrors = new Set<string>();
const creatingFinders = new Map<string, Promise<FinderEntry | null>>();

const now = () => Date.now();

const logCreateError = (indexRoot: string, error: unknown) => {
  if (loggedCreateErrors.has(indexRoot)) return;
  loggedCreateErrors.add(indexRoot);
  logger.error('fff create', error);
};

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

const stopPruneTimer = () => {
  if (!pruneTimer) return;
  clearInterval(pruneTimer);
  pruneTimer = null;
};

const ensurePruneTimer = () => {
  if (pruneTimer) return;
  pruneTimer = setInterval(() => {
    pruneFinders();
    if (finders.size === 0) stopPruneTimer();
  }, idlePruneMs);
  pruneTimer.unref();
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

const watchEntryReady = async (entry: FinderEntry) => {
  const startedAt = now();
  let delay = initialReadyWatchDelayMs;

  while (!entry.ready && now() - startedAt < readyWatchBudgetMs) {
    if (finders.get(entry.indexRoot) !== entry && !creatingFinders.has(entry.indexRoot)) return;
    if (await markReady(entry, readyProbeMs)) return;
    await sleep(delay);
    delay = Math.min(delay * 2, maxReadyWatchDelayMs);
  }
};

const createFinderEntry = async (indexRoot: string): Promise<FinderEntry | null> => {
  const fff = await loadFffNode();
  if (!fff) return null;

  let result: ReturnType<typeof fff.FileFinder.create> | null = null;
  try {
    result = fff.FileFinder.create({ basePath: indexRoot, aiMode: true });
  } catch (error) {
    logCreateError(indexRoot, error);
    return null;
  }
  if (!result.ok) {
    logCreateError(indexRoot, result.error);
    return null;
  }

  const entry: FinderEntry = {
    indexRoot,
    ready: false,
    lastUsedAt: now(),
    lastRefreshAt: now(),
    finder: result.value
  };
  watchEntryReady(entry);
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
    ensurePruneTimer();
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
  stopPruneTimer();
  for (const entry of finders.values()) destroyEntry(entry);
  finders.clear();
  creatingFinders.clear();
};
