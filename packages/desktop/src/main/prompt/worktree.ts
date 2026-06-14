import { baseDir } from '@main/application';
import { isManagedWorktree } from '@main/workspace/worktree';

export const worktreeSessionPrompt =
  'This session runs in a dedicated git worktree with its own branch. When the task is complete and the user is satisfied, ask whether to remove the worktree and delete its branch. Never remove the worktree without explicit confirmation.';

export const worktreeSessionGuidance = (cwd: string): string[] =>
  isManagedWorktree(baseDir, cwd) ? [worktreeSessionPrompt] : [];
