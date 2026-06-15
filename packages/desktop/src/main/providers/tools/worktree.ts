import { defineTool } from '@earendil-works/pi-coding-agent';
import { baseDir } from '@main/application';
import { gitTopLevel, listWorktrees, removeWorktree } from '@main/git';
import { toolResult } from '@main/providers/tools/result';
import { isManagedWorktree } from '@main/workspace/worktree';

interface CreateWorktreeToolsOptions {
  cwd: () => string;
  owners?: (path: string) => WorktreeOwner[];
}

export interface WorktreeOwner {
  id: string;
  title: string;
  active: boolean;
}

interface WorktreeListing {
  path: string;
  branch: string;
  locked: boolean;
  owners: WorktreeOwner[] | null;
}

const ownerSuffix = (owners: WorktreeOwner[] | null) => {
  if (owners === null) return '';
  const [first, ...rest] = owners;
  if (!first) return ' — orphan';
  const active = owners.some((owner) => owner.active) ? ' (active)' : '';
  const more = rest.length > 0 ? ` +${rest.length}` : '';
  return ` session: "${first.title}"${active}${more}`;
};

export const formatWorktrees = (worktrees: readonly WorktreeListing[]): string => {
  if (worktrees.length === 0) return 'No managed worktrees.';
  return worktrees
    .map(
      (tree) =>
        `${tree.path} [${tree.branch || 'detached'}]${tree.locked ? ' (locked)' : ''}${ownerSuffix(tree.owners)}`
    )
    .join('\n');
};

export const runListWorktrees = async (cwd: string, owners?: (path: string) => WorktreeOwner[]) => {
  const repoRoot = await gitTopLevel(cwd);
  if (!repoRoot) return toolResult('The current workspace is not a git repository.', null);
  const managed = (await listWorktrees(repoRoot)).filter((tree) => isManagedWorktree(baseDir, tree.path));
  const listings: WorktreeListing[] = managed.map((tree) => ({
    path: tree.path,
    branch: tree.branch,
    locked: tree.locked,
    owners: owners ? owners(tree.path) : null
  }));
  return toolResult(formatWorktrees(listings), null);
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

export const createWorktreeTools = ({ cwd, owners }: CreateWorktreeToolsOptions) => [
  defineTool({
    name: 'list_worktrees',
    label: 'list worktrees',
    parameters: listParameters,
    description: 'List the managed worktrees, with their branch and owning sessions.',
    promptSnippet: 'List the managed worktrees.',
    execute: async () => runListWorktrees(cwd(), owners)
  }),
  defineTool({
    name: 'delete_worktree',
    label: 'delete worktree',
    parameters: deleteParameters,
    description: 'Delete a managed worktree by path. Ask the user first; deletion cannot be undone.',
    promptSnippet: 'Delete a managed worktree.',
    execute: async (_toolCallId, { path, force }) => runDeleteWorktree(cwd(), path, force ?? false)
  })
];
