import { baseDir } from '@main/application';
import { managedWorktreeRoot } from '@main/workspace/worktree';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getStorageSnapshot } from '../fakes/storage.js';
import { freshChatService } from '../helpers/chat-service.js';

const git = vi.hoisted(() => ({
  getGitBranch: vi.fn(async () => undefined),
  gitTopLevel: vi.fn(async () => ''),
  addWorktree: vi.fn(async (_repoRoot: string, worktreePath: string, _options?: { branch?: string }) => ({
    path: worktreePath,
    head: '',
    branch: '',
    isMain: false,
    locked: false
  })),
  listWorktrees: vi.fn(async () => [{ path: '/repo', head: '', branch: 'main', isMain: true, locked: false }]),
  removeWorktree: vi.fn(async () => true)
}));

vi.mock('@main/git', () => git);

const worktreeRoot = managedWorktreeRoot(baseDir);

describe('worktree-backed tabs', () => {
  beforeEach(() => {
    git.gitTopLevel.mockResolvedValue('');
  });

  it('creates an isolated worktree session under the managed root', async () => {
    git.gitTopLevel.mockResolvedValue('/repo');
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });

    const tab = await chat.createWorktreeTab('fix the bug');

    expect(git.addWorktree).toHaveBeenCalledTimes(1);
    expect(git.addWorktree.mock.calls[0]?.[2]).toMatchObject({ branch: expect.stringMatching(/^start\/fix-the-bug-/) });
    expect(tab.workspacePath.startsWith(worktreeRoot)).toBe(true);
  });

  it('does not persist the ephemeral worktree path as the last workspace', async () => {
    git.gitTopLevel.mockResolvedValue('/repo');
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });

    await chat.createWorktreeTab('fix the bug');

    expect(getStorageSnapshot().lastWorkspace).toBe('/tmp/workspace-a');
  });

  it('falls back to a normal tab outside a git repository', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });

    const tab = await chat.createWorktreeTab('anything');

    expect(git.addWorktree).not.toHaveBeenCalled();
    expect(tab.workspacePath).toBe('/tmp/workspace-a');
  });

  it('removes the managed worktree when its tab is closed', async () => {
    git.gitTopLevel.mockResolvedValue('/repo');
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });

    const tab = await chat.createWorktreeTab('cleanup me');
    await chat.closeTab(tab.id);

    expect(git.removeWorktree).toHaveBeenCalledWith('/repo', tab.workspacePath);
  });

  it('leaves non-worktree tabs untouched on close', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });

    const tab = await chat.createTab('/tmp/workspace-a');
    await chat.closeTab(tab.id);

    expect(git.removeWorktree).not.toHaveBeenCalled();
  });
});
