import { watch, type FSWatcher } from 'node:fs';
import path from 'node:path';
import { type GitChangeSummary, type GitPatch, getGitChangeSummary, getGitPatch } from '@main/git';

export interface GitChangesPayload {
  workspacePath: string;
  patchUnavailable?: true;
  patch?: GitPatch;
  summary?: GitChangeSummary;
}

interface GitChangesEntry {
  workspacePath: string;
  watchers: FSWatcher[];
  refreshTimer?: ReturnType<typeof setTimeout>;
  patch?: GitPatch;
  patchLoaded: boolean;
  patchRequest?: Promise<MaybeGitPatch>;
  summary?: GitChangeSummary;
  summaryLoaded: boolean;
  summaryRequest?: Promise<MaybeGitChangeSummary>;
}

interface GitChangesServiceOptions {
  currentWorkspace: () => string;
  notify: (payload: GitChangesPayload) => void;
}

const gitChangesDebounceMs = 180;
const gitDirectoryName = '.git';
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
      watchers: [],
      workspacePath: key
    };
    this.entries.set(key, entry);
    this.watchWorkspace(entry);
    return entry;
  }

  private async loadSummary(entry: GitChangesEntry): Promise<MaybeGitChangeSummary> {
    if (entry.summaryLoaded) return entry.summary;
    if (entry.summaryRequest) return entry.summaryRequest;

    let request: Promise<MaybeGitChangeSummary>;
    request = getGitChangeSummary(entry.workspacePath)
      .then((summary) => {
        entry.summaryLoaded = true;
        if (summary) {
          entry.summary = summary;
        } else {
          delete entry.summary;
        }
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
        entry.patchLoaded = true;
        if (patch) {
          entry.patch = patch;
        } else {
          delete entry.patch;
        }
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
      this.refresh(entry).catch(() => {});
    }, gitChangesDebounceMs);
  }

  private async refresh(entry: GitChangesEntry): Promise<void> {
    const refreshPatch = entry.patchLoaded;
    const [summary, patch] = await Promise.all([
      getGitChangeSummary(entry.workspacePath),
      refreshPatch ? getGitPatch(entry.workspacePath) : Promise.resolve(entry.patch)
    ]);
    const previousSummary = entry.summary ?? null;
    const previousPatch = entry.patch ?? null;
    const nextSummary = summary ?? null;
    const nextPatch = patch ?? null;

    entry.summaryLoaded = true;
    if (summary) {
      entry.summary = summary;
    } else {
      delete entry.summary;
    }
    if (refreshPatch) {
      entry.patchLoaded = true;
      if (patch) {
        entry.patch = patch;
      } else {
        delete entry.patch;
      }
    }

    if (sameSummary(previousSummary, nextSummary) && samePatch(previousPatch, nextPatch)) return;

    this.notify({
      workspacePath: entry.workspacePath,
      ...(entry.patchLoaded && !entry.patch ? { patchUnavailable: true } : {}),
      ...(entry.patch ? { patch: entry.patch } : {}),
      ...(entry.summary ? { summary: entry.summary } : {})
    });
  }

  private watchWorkspace(entry: GitChangesEntry): void {
    this.addWatcher(entry, entry.workspacePath, true);
    this.addWatcher(entry, path.join(entry.workspacePath, gitDirectoryName), false);
  }

  private addWatcher(entry: GitChangesEntry, targetPath: string, recursive: boolean): void {
    try {
      const watcher = watch(targetPath, { recursive }, () => this.scheduleRefresh(entry));
      watcher.on('error', () => this.closeWatcher(entry, watcher));
      entry.watchers.push(watcher);
    } catch {
      if (recursive) this.addWatcher(entry, targetPath, false);
    }
  }

  private closeWatcher(entry: GitChangesEntry, watcher: FSWatcher): void {
    watcher.close();
    entry.watchers = entry.watchers.filter((item) => item !== watcher);
  }

  private closeWatchers(entry: GitChangesEntry): void {
    for (const watcher of entry.watchers) watcher.close();
    entry.watchers = [];
  }
}
