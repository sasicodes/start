import { join } from 'node:path';
import { baseDir } from '@main/application';
import { worktreeSessionGuidance, worktreeSessionPrompt } from '@main/prompt/worktree';
import { managedWorktreeRoot } from '@main/workspace/worktree';
import { describe, expect, it } from 'vitest';

describe('worktreeSessionGuidance', () => {
  it('asks the agent to confirm worktree removal inside a managed worktree', () => {
    const cwd = join(managedWorktreeRoot(baseDir), 'abc123', 'fix-bug');
    expect(worktreeSessionGuidance(cwd)).toEqual([worktreeSessionPrompt]);
  });

  it('adds nothing for an ordinary workspace', () => {
    expect(worktreeSessionGuidance('/tmp/workspace-a')).toEqual([]);
  });
});
