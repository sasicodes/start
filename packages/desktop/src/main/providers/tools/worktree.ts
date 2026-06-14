import { randomUUID } from 'node:crypto';
import { defineTool } from '@earendil-works/pi-coding-agent';
import { baseDir } from '@main/application';
import { addWorktree, type GitWorktree, gitTopLevel, listWorktrees, removeWorktree } from '@main/git';
import { toolResult } from '@main/providers/tools/result';
import { worktreeBranch, worktreePathFor, worktreeSlug } from '@main/workspace/worktree';

interface CreateWorktreeToolsOptions {
  cwd: () => string;
}

const parameters = {
  type: 'object',
  required: ['action'],
  additionalProperties: false,
  properties: {
    action: {
      type: 'string',
      enum: ['create', 'list', 'remove'],
      description: 'Create a new worktree, list existing worktrees, or remove one.'
    },
    name: {
      type: 'string',
      description: 'Short label for the new branch when action is "create".'
    },
    path: {
      type: 'string',
      description: 'Absolute path of the worktree to remove when action is "remove".'
    },
    force: {
      type: 'boolean',
      description: 'Remove even when the worktree has uncommitted changes (action "remove").'
    }
  }
} as const;

interface WorktreeAction {
  action: 'create' | 'list' | 'remove';
  name?: string;
  path?: string;
  force?: boolean;
}

export const formatWorktreeList = (worktrees: readonly GitWorktree[]): string => {
  if (worktrees.length === 0) return 'No worktrees found.';
  return worktrees
    .map(
      (tree) =>
        `${tree.isMain ? '*' : '-'} ${tree.path} [${tree.branch || 'detached'}]${tree.locked ? ' (locked)' : ''}`
    )
    .join('\n');
};

export const runWorktreeAction = async (cwd: string, { action, name, path, force }: WorktreeAction) => {
  const repoRoot = await gitTopLevel(cwd);
  if (!repoRoot) return toolResult('The current workspace is not a git repository.', null);

  if (action === 'list') {
    const worktrees = await listWorktrees(repoRoot);
    return toolResult(formatWorktreeList(worktrees), null);
  }

  if (action === 'create') {
    const slug = `${worktreeSlug(name ?? '')}-${randomUUID().slice(0, 8)}`;
    const worktree = await addWorktree(repoRoot, worktreePathFor(baseDir, repoRoot, slug), {
      branch: worktreeBranch(slug)
    });
    if (!worktree) return toolResult('Failed to create the worktree.', null);
    return toolResult(`Created worktree on branch ${worktree.branch} at ${worktree.path}`, null);
  }

  if (!path) return toolResult('Provide the path of the worktree to remove.', null);
  const removed = await removeWorktree(repoRoot, path, force ? { force: true } : {});
  if (!removed)
    return toolResult(`Could not remove ${path}. It may have uncommitted changes; pass force to override.`, null);
  return toolResult(`Removed worktree at ${path}`, null);
};

export const createWorktreeTools = ({ cwd }: CreateWorktreeToolsOptions) => [
  defineTool({
    name: 'worktree',
    label: 'worktree',
    parameters,
    description:
      'Create and manage isolated git worktrees for parallel work. Each created worktree gets its own branch and directory. Ask the user before removing a worktree; removal is not reversible.',
    promptSnippet: 'Create or manage isolated git worktrees for parallel work.',
    execute: (_toolCallId, args) => runWorktreeAction(cwd(), args)
  })
];
