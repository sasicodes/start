import { execFile } from 'node:child_process';
import { watch, type FSWatcher } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { type GitChangeSummary, type GitPatch, getGitChangeSummary, getGitPatch } from '@main/git';

export interface GitChangesPayload {
  workspacePath: string;
  patchUnavailable?: true;
  patch?: GitPatch;
  summary?: GitChangeSummary;
}

interface GitChangesEntry {
  workspacePath: string;
  watchers: Map<string, FSWatcher>;
  refreshTimer?: ReturnType<typeof setTimeout>;
  patch?: GitPatch;
  patchLoaded: boolean;
  patchRequest?: Promise<MaybeGitPatch>;
  summary?: GitChangeSummary;
  summaryLoaded: boolean;
  summaryRequest?: Promise<MaybeGitChangeSummary>;
  watchRequest?: Promise<void>;
}

interface GitChangesServiceOptions {
  currentWorkspace: () => string;
  notify: (payload: GitChangesPayload) => void;
}

interface GitWatchTarget {
  path: string;
  recursive: boolean;
}

const gitChangesDebounceMs = 180;
const gitDirectoryName = '.git';
const maxWorkspaceWatchDirectories = 512;
const gitWatchDirectoryArgs = ['ls-files', '-co', '--exclude-standard', '-z'];
const execFileAsync = promisify(execFile);
type MaybeGitPatch = Awaited<ReturnType<typeof getGitPatch>>;
type MaybeGitChangeSummary = Awaited<ReturnType<typeof getGitChangeSummary>>;

const sameSummary = (first: GitChangeSummary | null, second: GitChangeSummary | null) => {
  if (!first || !second) return first === second;
  return (
    first.filesChanged === second.filesChanged &&
    first.insertions === second.insertions &&
    first.deletions === second.deletions
  );
};

const samePatch = (first: GitPatch | null, second: GitPatch | null) => {
  if (!first || !second) return first === second;
  if (first.sections.length !== second.sections.length) return false;
  return first.sections.every((section, index) => {
    const nextSection = second.sections[index];
    if (!nextSection) return false;
    return (
      section.kind === nextSection.kind &&
      section.patch === nextSection.patch &&
      section.limited === nextSection.limited &&
      section.deletions === nextSection.deletions &&
      section.insertions === nextSection.insertions &&
      section.filesChanged === nextSection.filesChanged
    );
  });
};

const stdoutFromExecResult = (value: unknown) => {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return '';

  const result = value as { stdout?: unknown };
  return typeof result.stdout === 'string' ? result.stdout : '';
};

const fallbackGitWatchTargets = (workspacePath: string): GitWatchTarget[] => [
  {
    path: workspacePath,
    recursive: false
  },
  {
    path: path.join(workspacePath, gitDirectoryName),
    recursive: true
  }
];

const gitWatchDirectories = async (workspacePath: string) => {
  const directories = new Set([workspacePath]);

  try {
    const result = await execFileAsync('git', gitWatchDirectoryArgs, {
      cwd: workspacePath,
      encoding: 'utf8',
      maxBuffer: 4 * 1024 * 1024,
      timeout: 1200
    });
    const stdout = stdoutFromExecResult(result);

    for (const filePath of stdout.split('\0')) {
      let directory = path.dirname(filePath);
      while (directory && directory !== '.') {
        directories.add(path.join(workspacePath, directory));
        directory = path.dirname(directory);
      }
    }
  } catch {
    return [workspacePath];
  }

  return [...directories].sort((first, second) => first.length - second.length).slice(0, maxWorkspaceWatchDirectories);
};

const gitWatchTargets = async (workspacePath: string): Promise<GitWatchTarget[]> => {
  const directories = await gitWatchDirectories(workspacePath);
  return [
    ...directories.map((directory) => ({
      path: directory,
      recursive: false
    })),
    {
      path: path.join(workspacePath, gitDirectoryName),
      recursive: true
    }
  ];
};

export class GitChangesService {
  private readonly entries = new Map<string, GitChangesEntry>();
  private readonly currentWorkspace: () => string;
  private readonly notify: (payload: GitChangesPayload) => void;

  constructor(options: GitChangesServiceOptions) {
    this.notify = options.notify;
    this.currentWorkspace = options.currentWorkspace;
  }

  getSummary(workspacePath = this.currentWorkspace()): Promise<MaybeGitChangeSummary> {
    const entry = this.entryFor(workspacePath);
    return this.loadSummary(entry);
  }

  getPatch(workspacePath = this.currentWorkspace()): Promise<MaybeGitPatch> {
    const entry = this.entryFor(workspacePath);
    return this.loadPatch(entry);
  }

  dispose(): void {
    for (const entry of this.entries.values()) {
      this.closeWatchers(entry);
      if (entry.refreshTimer) clearTimeout(entry.refreshTimer);
    }
    this.entries.clear();
  }

  private entryFor(workspacePath: string): GitChangesEntry {
    const key = path.resolve(workspacePath);
    const current = this.entries.get(key);
    if (current) return current;

    const entry: GitChangesEntry = {
      patchLoaded: false,
      summaryLoaded: false,
      watchers: new Map(),
      workspacePath: key
    };
    this.entries.set(key, entry);
    this.applyWatchTargets(entry, fallbackGitWatchTargets(entry.workspacePath));
    this.watchWorkspace(entry);
    return entry;
  }

  private async loadSummary(entry: GitChangesEntry): Promise<MaybeGitChangeSummary> {
    if (entry.summaryLoaded) return entry.summary;
    if (entry.summaryRequest) return entry.summaryRequest;

    let request: Promise<MaybeGitChangeSummary>;
    request = getGitChangeSummary(entry.workspacePath)
      .then((summary) => {
        this.storeSummary(entry, summary);
        return summary;
      })
      .finally(() => {
        if (entry.summaryRequest === request) delete entry.summaryRequest;
      });
    entry.summaryRequest = request;
    return request;
  }

  private async loadPatch(entry: GitChangesEntry): Promise<MaybeGitPatch> {
    if (entry.patchLoaded) return entry.patch;
    if (entry.patchRequest) return entry.patchRequest;

    let request: Promise<MaybeGitPatch>;
    request = getGitPatch(entry.workspacePath)
      .then((patch) => {
        this.storePatch(entry, patch);
        return patch;
      })
      .finally(() => {
        if (entry.patchRequest === request) delete entry.patchRequest;
      });
    entry.patchRequest = request;
    return request;
  }

  private scheduleRefresh(entry: GitChangesEntry): void {
    if (entry.refreshTimer) clearTimeout(entry.refreshTimer);
    entry.refreshTimer = setTimeout(() => {
      delete entry.refreshTimer;
      this.refresh(entry).catch(() => this.handleRefreshFailure(entry));
    }, gitChangesDebounceMs);
  }

  private async refresh(entry: GitChangesEntry): Promise<void> {
    const refreshPatch = entry.patchLoaded;
    const patchRequest = refreshPatch ? getGitPatch(entry.workspacePath) : Promise.resolve(entry.patch);
    const [summary, patch] = await Promise.all([getGitChangeSummary(entry.workspacePath), patchRequest]);
    const previousSummary = entry.summary ?? null;
    const previousPatch = entry.patch ?? null;
    const nextSummary = summary ?? null;
    const nextPatch = patch ?? null;

    this.storeSummary(entry, summary);
    if (refreshPatch) this.storePatch(entry, patch);
    this.watchWorkspace(entry);

    const patchChanged = !samePatch(previousPatch, nextPatch);
    const summaryChanged = !sameSummary(previousSummary, nextSummary);
    if (!patchChanged && !summaryChanged) return;

    this.notifyCurrentState(entry);
  }

  private watchWorkspace(entry: GitChangesEntry): void {
    if (entry.watchRequest) return;

    let request: Promise<void>;
    request = gitWatchTargets(entry.workspacePath)
      .then((targets) => this.applyWatchTargets(entry, targets))
      .catch(() => this.applyWatchTargets(entry, fallbackGitWatchTargets(entry.workspacePath)))
      .finally(() => {
        if (entry.watchRequest === request) delete entry.watchRequest;
      });
    entry.watchRequest = request;
  }

  private applyWatchTargets(entry: GitChangesEntry, targets: GitWatchTarget[]): void {
    const targetPaths = new Set(targets.map((target) => target.path));

    for (const targetPath of entry.watchers.keys()) {
      if (!targetPaths.has(targetPath)) this.closeWatcher(entry, targetPath);
    }

    for (const target of targets) {
      this.addWatcher(entry, target);
    }
  }

  private addWatcher(entry: GitChangesEntry, target: GitWatchTarget): void {
    if (entry.watchers.has(target.path)) return;

    try {
      const watcher = watch(target.path, { recursive: target.recursive }, () => this.scheduleRefresh(entry));
      watcher.on('error', () => this.closeWatcher(entry, target.path));
      entry.watchers.set(target.path, watcher);
    } catch {
      if (target.recursive) this.addWatcher(entry, { ...target, recursive: false });
    }
  }

  private closeWatcher(entry: GitChangesEntry, targetPath: string): void {
    const watcher = entry.watchers.get(targetPath);
    if (!watcher) return;

    watcher.close();
    entry.watchers.delete(targetPath);
  }

  private closeWatchers(entry: GitChangesEntry): void {
    for (const watcher of entry.watchers.values()) watcher.close();
    entry.watchers.clear();
  }

  private handleRefreshFailure(entry: GitChangesEntry): void {
    const hadPatch = Boolean(entry.patch);
    const hadSummary = Boolean(entry.summary);
    const hadCachedState = hadPatch || hadSummary;

    this.storeSummary(entry);
    if (entry.patchLoaded) this.storePatch(entry);
    if (!hadCachedState) return;

    this.notifyCurrentState(entry);
  }

  private notifyCurrentState(entry: GitChangesEntry): void {
    const patchUnavailable = entry.patchLoaded && !entry.patch;

    this.notify({
      workspacePath: entry.workspacePath,
      ...(patchUnavailable ? { patchUnavailable: true } : {}),
      ...(entry.patch ? { patch: entry.patch } : {}),
      ...(entry.summary ? { summary: entry.summary } : {})
    });
  }

  private storePatch(entry: GitChangesEntry, patch?: MaybeGitPatch): void {
    entry.patchLoaded = true;
    if (patch) {
      entry.patch = patch;
      return;
    }

    delete entry.patch;
  }

  private storeSummary(entry: GitChangesEntry, summary?: MaybeGitChangeSummary): void {
    entry.summaryLoaded = true;
    if (summary) {
      entry.summary = summary;
      return;
    }

    delete entry.summary;
  }
}
