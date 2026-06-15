import { join } from 'node:path';
import { baseDir } from '@main/application';
import type { GitWorktree } from '@main/git';
import { formatWorktrees, runDeleteWorktree, runListWorktrees } from '@main/providers/tools/worktree';
import { managedWorktreeRoot } from '@main/workspace/worktree';
import { describe, expect, it, vi } from 'vitest';

const managedPath = join(managedWorktreeRoot(baseDir), 'abc123', 'fix-bug');

const git = vi.hoisted(() => ({
  gitTopLevel: vi.fn(async () => '/repo'),
  listWorktrees: vi.fn(async () => [] as GitWorktree[]),
  removeWorktree: vi.fn(async () => true)
}));

vi.mock('@main/git', () => git);

describe('formatWorktrees', () => {
  it('renders path, branch and locked state', () => {
    const text = formatWorktrees([{ path: '/repo/.wt', head: 'a', branch: 'start/x', isMain: false, locked: true }]);
    expect(text).toBe('/repo/.wt [start/x] (locked)');
  });

  it('reports an empty list', () => {
    expect(formatWorktrees([])).toBe('No managed worktrees.');
  });
});

describe('list_worktrees', () => {
  it('returns only managed worktrees', async () => {
    git.listWorktrees.mockResolvedValueOnce([
      { path: '/repo', head: 'a', branch: 'main', isMain: true, locked: false },
      { path: managedPath, head: 'b', branch: 'start/fix-bug', isMain: false, locked: false }
    ]);
    const result = await runListWorktrees('/repo');
    expect(result.content[0]?.text).toBe(`${managedPath} [start/fix-bug]`);
  });

  it('reports when the workspace is not a git repository', async () => {
    git.gitTopLevel.mockResolvedValueOnce('');
    expect((await runListWorktrees('/x')).content[0]?.text).toContain('not a git repository');
  });
});

describe('delete_worktree', () => {
  it('refuses to delete a path outside the managed root', async () => {
    const result = await runDeleteWorktree('/repo', '/repo', false);
    expect(git.removeWorktree).not.toHaveBeenCalled();
    expect(result.content[0]?.text).toContain('not a managed worktree');
  });

  it('deletes a managed worktree', async () => {
    await runDeleteWorktree('/repo', managedPath, true);
    expect(git.removeWorktree).toHaveBeenCalledWith('/repo', managedPath, { force: true });
  });
});
