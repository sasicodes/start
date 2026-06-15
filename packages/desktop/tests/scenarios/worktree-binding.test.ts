import { baseDir } from '@main/application';
import { managedWorktreeRoot } from '@main/workspace/worktree';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getStorageSnapshot } from '../fakes/storage.js';
import { freshChatService } from '../helpers/chat-service.js';

const git = vi.hoisted(() => ({
  getGitBranch: vi.fn(async () => undefined),
  gitTopLevel: vi.fn(async () => ''),
  addWorktree: vi.fn(
    async (_repoRoot: string, worktreePath: string, _options?: { branch?: string; base?: string }) => ({
      path: worktreePath,
      head: '',
      branch: '',
      isMain: false,
      locked: false
    })
  )
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
    expect(getStorageSnapshot().lastWorkspace).toBe('/tmp/workspace-a');
  });

  it('forks the worktree from the requested base branch', async () => {
    git.gitTopLevel.mockResolvedValue('/repo');
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });

    await chat.createWorktreeTab('fix the bug', 'develop');

    expect(git.addWorktree.mock.calls[0]?.[2]).toMatchObject({ base: 'develop' });
  });

  it('falls back to a normal tab outside a git repository', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });

    const tab = await chat.createWorktreeTab('anything');

    expect(git.addWorktree).not.toHaveBeenCalled();
    expect(tab.workspacePath).toBe('/tmp/workspace-a');
  });

  it('keeps the worktree on disk when its tab is closed', async () => {
    git.gitTopLevel.mockResolvedValue('/repo');
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });

    const tab = await chat.createWorktreeTab('keep me');
    await chat.closeTab(tab.id);

    expect(tab.workspacePath.startsWith(worktreeRoot)).toBe(true);
  });
});
