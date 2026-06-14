import type { GitWorktree } from '@main/git';
import { formatWorktreeList, runWorktreeAction } from '@main/providers/tools/worktree';
import { describe, expect, it, vi } from 'vitest';

const git = vi.hoisted(() => ({
  gitTopLevel: vi.fn(async () => '/repo'),
  listWorktrees: vi.fn(async () => [] as GitWorktree[]),
  addWorktree: vi.fn(async (_repoRoot: string, worktreePath: string, options?: { branch?: string }) => ({
    path: worktreePath,
    head: '',
    branch: options?.branch ?? '',
    isMain: false,
    locked: false
  })),
  removeWorktree: vi.fn(async () => true)
}));

vi.mock('@main/git', () => git);

const run = (args: Parameters<typeof runWorktreeAction>[1]) => runWorktreeAction('/repo', args);

describe('formatWorktreeList', () => {
  it('marks the main worktree and falls back to detached', () => {
    const text = formatWorktreeList([
      { path: '/repo', head: 'a', branch: 'main', isMain: true, locked: false },
      { path: '/repo/.wt', head: 'b', branch: '', isMain: false, locked: true }
    ]);
    expect(text).toBe('* /repo [main]\n- /repo/.wt [detached] (locked)');
  });

  it('reports an empty list', () => {
    expect(formatWorktreeList([])).toBe('No worktrees found.');
  });
});

describe('worktree tool', () => {
  it('creates a worktree on a start/ branch', async () => {
    const result = await run({ action: 'create', name: 'fix the bug' });
    expect(git.addWorktree).toHaveBeenCalledTimes(1);
    expect(git.addWorktree.mock.calls[0]?.[2]).toMatchObject({ branch: expect.stringMatching(/^start\/fix-the-bug-/) });
    expect(result.content[0]?.text).toContain('Created worktree');
  });

  it('refuses to remove without a path', async () => {
    const result = await run({ action: 'remove' });
    expect(git.removeWorktree).not.toHaveBeenCalled();
    expect(result.content[0]?.text).toContain('Provide the path');
  });

  it('removes a worktree by path', async () => {
    await run({ action: 'remove', path: '/repo/.wt', force: true });
    expect(git.removeWorktree).toHaveBeenCalledWith('/repo', '/repo/.wt', { force: true });
  });

  it('reports when the workspace is not a git repository', async () => {
    git.gitTopLevel.mockResolvedValueOnce('');
    const result = await run({ action: 'list' });
    expect(result.content[0]?.text).toContain('not a git repository');
  });
});
