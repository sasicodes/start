import { defineTool } from '@earendil-works/pi-coding-agent';
import { baseDir } from '@main/application';
import { type GitWorktree, gitTopLevel, listWorktrees, removeWorktree } from '@main/git';
import { toolResult } from '@main/providers/tools/result';
import { isManagedWorktree } from '@main/workspace/worktree';

interface CreateWorktreeToolsOptions {
  cwd: () => string;
}

export const formatWorktrees = (worktrees: readonly GitWorktree[]): string => {
  if (worktrees.length === 0) return 'No managed worktrees.';
  return worktrees
    .map((tree) => `${tree.path} [${tree.branch || 'detached'}]${tree.locked ? ' (locked)' : ''}`)
    .join('\n');
};

export const runListWorktrees = async (cwd: string) => {
  const repoRoot = await gitTopLevel(cwd);
  if (!repoRoot) return toolResult('The current workspace is not a git repository.', null);
  const managed = (await listWorktrees(repoRoot)).filter((tree) => isManagedWorktree(baseDir, tree.path));
  return toolResult(formatWorktrees(managed), null);
};

export const runDeleteWorktree = async (cwd: string, path: string, force: boolean) => {
  if (!path) return toolResult('Provide the worktree path to delete.', null);
  if (!isManagedWorktree(baseDir, path))
    return toolResult(`${path} is not a managed worktree; refusing to delete.`, null);
  const repoRoot = await gitTopLevel(cwd);
  if (!repoRoot) return toolResult('The current workspace is not a git repository.', null);
  const removed = await removeWorktree(repoRoot, path, force ? { force: true } : {});
  if (!removed)
    return toolResult(`Could not delete ${path}. It may have uncommitted changes; pass force to override.`, null);
  return toolResult(`Deleted worktree ${path}`, null);
};

const listParameters = { type: 'object', additionalProperties: false, properties: {} } as const;

const deleteParameters = {
  type: 'object',
  required: ['path'],
  additionalProperties: false,
  properties: {
    path: { type: 'string', description: 'Absolute path of the managed worktree to delete.' },
    force: { type: 'boolean', description: 'Delete even when the worktree has uncommitted changes.' }
  }
} as const;

export const createWorktreeTools = ({ cwd }: CreateWorktreeToolsOptions) => [
  defineTool({
    name: 'list_worktrees',
    label: 'list worktrees',
    parameters: listParameters,
    description: 'List the worktrees created for this repository, with their path and branch.',
    promptSnippet: 'List the worktrees created for isolated sessions.',
    execute: async () => runListWorktrees(cwd())
  }),
  defineTool({
    name: 'delete_worktree',
    label: 'delete worktree',
    parameters: deleteParameters,
    description:
      'Delete a worktree by path once its work is no longer needed. Only worktrees created by the app can be deleted. Ask the user before deleting; deletion is not reversible.',
    promptSnippet: 'Delete a worktree once its work is done.',
    execute: async (_toolCallId, { path, force }) => runDeleteWorktree(cwd(), path, force ?? false)
  })
];
