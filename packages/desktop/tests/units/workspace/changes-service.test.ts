import type { ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const gitMocks = vi.hoisted(() => ({
  getGitPatch: vi.fn(),
  getGitChangeSummary: vi.fn()
}));

const fsMocks = vi.hoisted(() => ({
  watchers: [] as FakeWatcher[],
  watch: vi.fn()
}));

const childProcessMocks = vi.hoisted(() =>
  import('../../fakes/exec.js').then((exec) => ({ execFile: exec.createExecFileMock() }))
);

class FakeWatcher extends EventEmitter {
  closed = false;
  listener: () => void;

  constructor(listener: () => void) {
    super();
    this.listener = listener;
  }

  close = () => {
    this.closed = true;
  };

  ref = () => this;

  unref = () => this;
}

vi.mock('@main/git', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@main/git')>()),
  ...gitMocks
}));

vi.mock('node:child_process', () => childProcessMocks);

const { execFile: execFileMock } = await childProcessMocks;

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
  return {
    ...actual,
    watch: fsMocks.watch
  };
});

const changedSummary = { deletions: 0, filesChanged: 2, insertions: 7 };
const initialSummary = { deletions: 0, filesChanged: 1, insertions: 3 };
const patch = {
  sections: [
    {
      deletions: 1,
      filesChanged: 1,
      insertions: 4,
      kind: 'unstaged' as const,
      limited: false,
      patch: 'diff --git a/a.ts b/a.ts'
    }
  ]
};
const changedPatch = {
  sections: [
    {
      deletions: 2,
      filesChanged: 1,
      insertions: 5,
      kind: 'unstaged' as const,
      limited: false,
      patch: 'diff --git a/b.ts b/b.ts'
    }
  ]
};

describe('GitChangesService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    fsMocks.watch.mockImplementation((_targetPath: string, _options: { recursive: boolean }, listener: () => void) => {
      const watcher = new FakeWatcher(listener);
      fsMocks.watchers.push(watcher);
      return watcher;
    });
    execFileMock.mockImplementation(
      (
        _command: string,
        _args: string[],
        _options: object,
        callback: (error: Error | null, stdout: string, stderr: string) => void
      ) => {
        callback(null, 'src/index.ts\0packages/app/view.tsx\0', '');
        return new EventEmitter() as ChildProcess;
      }
    );
    gitMocks.getGitPatch.mockResolvedValue(patch);
    gitMocks.getGitChangeSummary.mockResolvedValue(initialSummary);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    fsMocks.watchers.length = 0;
  });

  it('coalesces concurrent summary reads for a workspace', async () => {
    const { GitChangesService } = await import('@main/workspace/changes');
    const service = new GitChangesService({ notify: () => {}, focused: () => true, currentWorkspace: () => '/repo' });

    const [first, second] = await Promise.all([service.getSummary(), service.getSummary('/repo')]);

    expect(first).toEqual(initialSummary);
    expect(second).toEqual(initialSummary);
    expect(gitMocks.getGitChangeSummary).toHaveBeenCalledTimes(1);
  });

  it('caches unavailable summary reads for a workspace', async () => {
    const { GitChangesService } = await import('@main/workspace/changes');
    const service = new GitChangesService({ notify: () => {}, focused: () => true, currentWorkspace: () => '/repo' });
    gitMocks.getGitChangeSummary.mockImplementationOnce(async () => {
      return;
    });

    expect(await service.getSummary()).toBeFalsy();
    expect(await service.getSummary()).toBeFalsy();

    expect(gitMocks.getGitChangeSummary).toHaveBeenCalledTimes(1);
  });

  it('debounces watcher refreshes and notifies changed summaries', async () => {
    const notifications: unknown[] = [];
    const { GitChangesService } = await import('@main/workspace/changes');
    const service = new GitChangesService({
      focused: () => true,
      currentWorkspace: () => '/repo',
      notify: (payload) => notifications.push(payload)
    });
    await service.getSummary();
    gitMocks.getGitChangeSummary.mockResolvedValue(changedSummary);

    fsMocks.watchers[0]?.listener();
    fsMocks.watchers[0]?.listener();
    await vi.advanceTimersByTimeAsync(180);

    expect(gitMocks.getGitChangeSummary).toHaveBeenCalledTimes(2);
    expect(notifications).toEqual([{ summary: changedSummary, workspacePath: '/repo' }]);
  });

  it('watches git-visible workspace directories and the git directory', async () => {
    const { GitChangesService } = await import('@main/workspace/changes');
    const service = new GitChangesService({ notify: () => {}, focused: () => true, currentWorkspace: () => '/repo' });

    await service.getSummary();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(new Set(fsMocks.watch.mock.calls.map(([targetPath]) => targetPath))).toEqual(
      new Set(['/repo', '/repo/.git', '/repo/src', '/repo/packages', '/repo/packages/app'])
    );
  });

  it('caches patch reads and publishes the current summary after changes', async () => {
    const notifications: unknown[] = [];
    const { GitChangesService } = await import('@main/workspace/changes');
    const service = new GitChangesService({
      focused: () => true,
      currentWorkspace: () => '/repo',
      notify: (payload) => notifications.push(payload)
    });

    expect(await service.getPatch()).toEqual(patch);
    gitMocks.getGitChangeSummary.mockResolvedValue(changedSummary);
    gitMocks.getGitPatch.mockResolvedValue(changedPatch);
    fsMocks.watchers[0]?.listener();
    await vi.advanceTimersByTimeAsync(180);

    expect(notifications).toEqual([
      {
        patch: changedPatch,
        workspacePath: '/repo',
        summary: changedSummary
      }
    ]);
  });

  it('publishes explicit unavailable state after a cached patch disappears', async () => {
    const notifications: unknown[] = [];
    const { GitChangesService } = await import('@main/workspace/changes');
    const service = new GitChangesService({
      focused: () => true,
      currentWorkspace: () => '/repo',
      notify: (payload) => notifications.push(payload)
    });

    expect(await service.getPatch()).toEqual(patch);
    gitMocks.getGitPatch.mockResolvedValue(null);
    fsMocks.watchers[0]?.listener();
    await vi.advanceTimersByTimeAsync(180);

    expect(notifications).toEqual([{ patchUnavailable: true, summary: initialSummary, workspacePath: '/repo' }]);
  });

  it('publishes unavailable state instead of leaving stale summary after refresh failures', async () => {
    const notifications: unknown[] = [];
    const { GitChangesService } = await import('@main/workspace/changes');
    const service = new GitChangesService({
      focused: () => true,
      currentWorkspace: () => '/repo',
      notify: (payload) => notifications.push(payload)
    });

    expect(await service.getSummary()).toEqual(initialSummary);
    gitMocks.getGitChangeSummary.mockRejectedValue(new Error('git failed'));
    fsMocks.watchers[0]?.listener();
    await vi.advanceTimersByTimeAsync(180);

    expect(notifications).toEqual([{ workspacePath: '/repo' }]);
  });

  it('defers watcher refreshes while unfocused and runs them once refocused', async () => {
    let focused = false;
    const { GitChangesService } = await import('@main/workspace/changes');
    const service = new GitChangesService({
      notify: () => {},
      focused: () => focused,
      currentWorkspace: () => '/repo'
    });
    await service.getSummary();
    gitMocks.getGitChangeSummary.mockResolvedValue(changedSummary);

    fsMocks.watchers[0]?.listener();
    await vi.advanceTimersByTimeAsync(500);
    expect(gitMocks.getGitChangeSummary).toHaveBeenCalledTimes(1);

    focused = true;
    service.flushPendingRefreshes();
    await vi.advanceTimersByTimeAsync(180);
    expect(gitMocks.getGitChangeSummary).toHaveBeenCalledTimes(2);
  });

  it('evicts idle workspaces other than the active one', async () => {
    const { GitChangesService } = await import('@main/workspace/changes');
    const service = new GitChangesService({ notify: () => {}, focused: () => true, currentWorkspace: () => '/repo' });
    await service.getSummary('/other');
    const otherWatchers = [...fsMocks.watchers];

    await vi.advanceTimersByTimeAsync(11 * 60 * 1000);
    await service.getSummary('/repo');

    expect(otherWatchers.length).toBeGreaterThan(0);
    expect(otherWatchers.every((watcher) => watcher.closed)).toBe(true);
  });

  it('closes workspace watchers on dispose', async () => {
    const { GitChangesService } = await import('@main/workspace/changes');
    const service = new GitChangesService({ notify: () => {}, focused: () => true, currentWorkspace: () => '/repo' });
    await service.getSummary();

    service.dispose();

    expect(fsMocks.watchers.length).toBeGreaterThan(0);
    expect(fsMocks.watchers.every((watcher) => watcher.closed)).toBe(true);
  });
});
