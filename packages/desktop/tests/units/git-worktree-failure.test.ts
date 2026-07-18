import type { ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const childProcessMocks = vi.hoisted(() =>
  import('../fakes/exec.js').then((exec) => ({ execFile: exec.createExecFileMock() }))
);

vi.mock('node:child_process', () => childProcessMocks);

const { execFile: execFileMock } = await childProcessMocks;
const { addWorktree, gitMainWorktree } = await import('@main/git');

const branch = 'start/partial-failure';
const worktreePath = '/tmp/start-partial-worktree';

const mockGit = (branchExists: boolean) => {
  execFileMock.mockImplementation(
    (
      _command: string,
      args: string[],
      _options: object,
      callback: (error: Error | null, stdout: string, stderr: string) => void
    ) => {
      if (args[0] === 'for-each-ref') {
        callback(null, branchExists ? `refs/heads/${branch}\n` : '', '');
      } else if (args[0] === 'worktree' && args[1] === 'add') {
        callback(new Error('checkout failed'), '', 'checkout failed');
      } else {
        callback(null, '', '');
      }
      return new EventEmitter() as ChildProcess;
    }
  );
};

describe('addWorktree failure cleanup', () => {
  beforeEach(() => {
    execFileMock.mockReset();
  });

  it('deletes a generated branch after a partial creation failure', async () => {
    mockGit(false);

    await expect(addWorktree('/repo', worktreePath, { branch })).rejects.toThrow('checkout failed');

    expect(execFileMock).toHaveBeenCalledWith(
      'git',
      ['worktree', 'add', '--quiet', '-b', branch, worktreePath],
      expect.objectContaining({ timeout: 60_000 }),
      expect.any(Function)
    );
    expect(execFileMock).toHaveBeenCalledWith(
      'git',
      ['branch', '-D', branch],
      expect.any(Object),
      expect.any(Function)
    );
    expect(
      execFileMock.mock.calls.filter((call) => call[1]?.[0] === 'worktree' && call[1]?.[1] === 'prune')
    ).toHaveLength(1);
  });

  it('preserves a branch that existed before creation', async () => {
    mockGit(true);

    await expect(addWorktree('/repo', worktreePath, { branch })).rejects.toThrow('checkout failed');

    expect(execFileMock.mock.calls.some((call) => call[1]?.[0] === 'branch' && call[1]?.[1] === '-D')).toBe(false);
  });
});

describe('gitMainWorktree', () => {
  beforeEach(() => {
    execFileMock.mockReset();
  });

  it('resolves the primary repository from a linked worktree', async () => {
    execFileMock.mockImplementation(
      (
        _command: string,
        args: string[],
        _options: object,
        callback: (error: Error | null, stdout: string, stderr: string) => void
      ) => {
        const stdout =
          args[0] === 'rev-parse'
            ? '/repo/worktrees/current\n'
            : 'worktree /repo\0HEAD abc\0branch refs/heads/main\0\0worktree /repo/worktrees/current\0HEAD def\0branch refs/heads/start/current\0\0';
        callback(null, stdout, '');
        return new EventEmitter() as ChildProcess;
      }
    );

    await expect(gitMainWorktree('/repo/worktrees/current')).resolves.toBe('/repo');
    expect(execFileMock.mock.calls.some((call) => call[1]?.[0] === 'rev-parse')).toBe(false);
  });

  it('falls back to the Git top level when worktree listing fails', async () => {
    execFileMock.mockImplementation(
      (
        _command: string,
        args: string[],
        _options: object,
        callback: (error: Error | null, stdout: string, stderr: string) => void
      ) => {
        if (args[0] === 'worktree') callback(new Error('worktree list failed'), '', 'worktree list failed');
        else callback(null, '/repo\n', '');
        return new EventEmitter() as ChildProcess;
      }
    );

    await expect(gitMainWorktree('/repo/worktrees/current')).resolves.toBe('/repo');
  });
});
