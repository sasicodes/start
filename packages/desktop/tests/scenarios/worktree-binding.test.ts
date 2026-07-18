import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { baseDir } from '@main/application';
import { managedWorktreeRoot, repoFolderName, worktreePathFor } from '@main/workspace/worktree';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeSessionManager, getFakeSession } from '../fakes/agent/index.js';
import { getStorageSnapshot } from '../fakes/storage.js';
import { freshChatService } from '../helpers/chat-service.js';

const git = vi.hoisted(() => ({
  addWorktree: vi.fn(),
  listWorktrees: vi.fn(async () => []),
  discardWorktree: vi.fn(async () => {}),
  getGitBranch: vi.fn(async () => undefined),
  gitMainWorktree: vi.fn(async (_cwd: string) => '')
}));

vi.mock('@main/git', () => git);

const worktreeRoot = managedWorktreeRoot(baseDir);

describe('worktree-backed tabs', () => {
  beforeEach(() => {
    git.gitMainWorktree.mockResolvedValue('');
    git.addWorktree.mockImplementation(
      async (_repoRoot: string, worktreePath: string, _options?: { branch?: string; base?: string }) => ({
        head: '',
        branch: '',
        isMain: false,
        locked: false,
        path: worktreePath
      })
    );
  });

  it('creates an isolated worktree session under the managed root', async () => {
    git.gitMainWorktree.mockResolvedValue('/repo');
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });

    const tab = await chat.createWorktreeTab('fix the bug');

    expect(git.addWorktree).toHaveBeenCalledTimes(1);
    expect(git.addWorktree.mock.calls[0]?.[2]).toMatchObject({ branch: expect.stringMatching(/^start\/fix-the-bug-/) });
    expect(tab.workspacePath.startsWith(worktreeRoot)).toBe(true);
    expect(getStorageSnapshot().lastWorkspace).toBe('/tmp/workspace-a');
  });

  it('forks the worktree from the requested base branch', async () => {
    git.gitMainWorktree.mockResolvedValue('/repo');
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });

    await chat.createWorktreeTab('fix the bug', 'develop');

    expect(git.addWorktree.mock.calls[0]?.[2]).toMatchObject({ base: 'develop' });
  });

  it('fails without creating a normal tab outside a git repository', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });

    await expect(chat.createWorktreeTab('anything')).rejects.toThrow('/tmp/workspace-a is not a Git repository.');

    expect(git.addWorktree).not.toHaveBeenCalled();
    expect(chat.getTabs()).toEqual([]);
  });

  it('creates nested agent worktrees under the primary repository folder', async () => {
    git.gitMainWorktree.mockResolvedValue('/repo');
    const chat = freshChatService({ lastWorkspace: '/tmp/foreground' });
    const callerWorktree = worktreePathFor(baseDir, '/repo', 'caller');

    const summary = await chat.startSession({
      prompt: 'do work',
      cwd: callerWorktree,
      environment: { type: 'worktree', branch: 'caller-work' }
    });

    expect(git.gitMainWorktree).toHaveBeenCalledWith(callerWorktree);
    expect(git.addWorktree).toHaveBeenCalledWith(
      '/repo',
      expect.stringContaining(repoFolderName('/repo')),
      expect.objectContaining({ branch: expect.stringMatching(/^start\/caller-work-/) })
    );
    const session = getFakeSession(summary.id);
    await session?.awaitPromptCall();
    session?.finishPrompt();
  });

  it('does not nest a worktree when the primary repository cannot be resolved', async () => {
    const callerWorktree = worktreePathFor(baseDir, '/repo', 'caller');
    git.gitMainWorktree.mockResolvedValue(callerWorktree);
    const chat = freshChatService({ lastWorkspace: callerWorktree });

    await expect(chat.startSession({ prompt: 'do work', environment: { type: 'worktree' } })).rejects.toThrow(
      `Could not resolve the primary Git repository for ${callerWorktree}.`
    );

    expect(git.addWorktree).not.toHaveBeenCalled();
    expect(chat.getTabs()).toEqual([]);
  });

  it('does not start a session when worktree creation fails', async () => {
    git.gitMainWorktree.mockResolvedValue('/repo');
    git.addWorktree.mockRejectedValue(new Error('fatal: invalid reference'));
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });

    await expect(
      chat.startSession({ prompt: 'do work', environment: { type: 'worktree', base: 'missing' } })
    ).rejects.toThrow('fatal: invalid reference');

    expect(chat.getTabs()).toEqual([]);
  });

  it('discards the worktree when session construction fails', async () => {
    git.gitMainWorktree.mockResolvedValue('/repo');
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a', models: [] });

    await expect(chat.createWorktreeTab('broken-session')).rejects.toThrow('No configured models found.');

    expect(git.discardWorktree).toHaveBeenCalledWith(
      '/repo',
      expect.any(String),
      expect.stringMatching(/^start\/broken-session-/)
    );
    expect(chat.getTabs()).toEqual([]);
  });

  it('discards a background worktree when session construction fails', async () => {
    git.gitMainWorktree.mockResolvedValue('/repo');
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a', models: [] });

    await expect(
      chat.startSession({ prompt: 'do work', environment: { type: 'worktree', branch: 'broken-agent' } })
    ).rejects.toThrow('No configured models found.');

    expect(git.discardWorktree).toHaveBeenCalledWith(
      '/repo',
      expect.any(String),
      expect.stringMatching(/^start\/broken-agent-/)
    );
    expect(chat.getTabs()).toEqual([]);
  });

  it('keeps the worktree on disk when its tab is closed', async () => {
    git.gitMainWorktree.mockResolvedValue('/repo');
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });

    const tab = await chat.createWorktreeTab('keep me');
    await chat.closeTab(tab.id);

    expect(tab.workspacePath.startsWith(worktreeRoot)).toBe(true);
  });

  it('groups an unresolved managed worktree session under its known repository', async () => {
    const repoRoot = mkdtempSync(path.join(tmpdir(), 'start-worktree-root-'));
    try {
      const chat = freshChatService({ lastWorkspace: repoRoot });
      const stored = FakeSessionManager.create(worktreePathFor(baseDir, repoRoot, 'orphan'));
      stored.appendEntry({ type: 'message' });

      expect(
        (await chat.getWorkspaceFolders()).map((folder) => ({ path: folder.path, active: folder.active }))
      ).toEqual([{ path: repoRoot, active: true }]);
      expect(git.listWorktrees).not.toHaveBeenCalled();
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it('caches the primary repository resolved for a managed worktree', async () => {
    const repoRoot = mkdtempSync(path.join(tmpdir(), 'start-worktree-root-'));
    try {
      const worktree = worktreePathFor(baseDir, repoRoot, 'cached');
      git.gitMainWorktree.mockResolvedValue(repoRoot);
      const chat = freshChatService({ lastWorkspace: worktree });

      await chat.getWorkspaceFolders();
      await chat.getWorkspaceFolders();

      expect(git.gitMainWorktree).toHaveBeenCalledTimes(1);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });
});
