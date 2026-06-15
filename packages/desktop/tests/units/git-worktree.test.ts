import { parseWorktreeList } from '@main/git';
import { describe, expect, it } from 'vitest';

const record = (lines: string[]) => `${lines.join('\0')}\0\0`;

describe('parseWorktreeList', () => {
  it('returns an empty list for empty output', () => {
    expect(parseWorktreeList('')).toEqual([]);
  });

  it('marks the first worktree as main and shortens branch refs', () => {
    const porcelain =
      record(['worktree /repo', 'HEAD abc123', 'branch refs/heads/main']) +
      record(['worktree /repo/.worktrees/feature', 'HEAD def456', 'branch refs/heads/start/feature']);

    expect(parseWorktreeList(porcelain)).toEqual([
      { path: '/repo', head: 'abc123', branch: 'main', isMain: true, locked: false },
      { path: '/repo/.worktrees/feature', head: 'def456', branch: 'start/feature', isMain: false, locked: false }
    ]);
  });

  it('treats detached worktrees as having no branch', () => {
    const porcelain =
      record(['worktree /repo', 'HEAD abc123', 'branch refs/heads/main']) +
      record(['worktree /repo/detached', 'HEAD 999', 'detached']);

    expect(parseWorktreeList(porcelain)[1]).toEqual({
      path: '/repo/detached',
      head: '999',
      branch: '',
      isMain: false,
      locked: false
    });
  });

  it('flags locked worktrees regardless of a reason suffix', () => {
    const porcelain =
      record(['worktree /repo', 'HEAD abc123', 'branch refs/heads/main']) +
      record(['worktree /repo/locked', 'HEAD 111', 'branch refs/heads/wip', 'locked maintenance window']);

    expect(parseWorktreeList(porcelain)[1]?.locked).toBe(true);
  });

  it('handles a bare main worktree with no head or branch', () => {
    const porcelain = record(['worktree /repo.git', 'bare']);

    expect(parseWorktreeList(porcelain)).toEqual([
      { path: '/repo.git', head: '', branch: '', isMain: true, locked: false }
    ]);
  });

  it('ignores trailing whitespace records without a worktree path', () => {
    const porcelain = `${record(['worktree /repo', 'HEAD abc123', 'branch refs/heads/main'])}\0`;

    expect(parseWorktreeList(porcelain)).toHaveLength(1);
  });
});
