import { createBrowserTools } from '@main/providers/tools/browser';
import { createFffTools } from '@main/providers/tools/fff/index';
import { createWebSearchTools } from '@main/providers/tools/search/index';
import { type SessionController, createSessionTools } from '@main/providers/tools/sessions';
import { createSubagentTools } from '@main/providers/tools/subagents';
import { type WorktreeOwner, createWorktreeTools } from '@main/providers/tools/worktree';

type SubagentToolsOptions = Parameters<typeof createSubagentTools>[0];

type StartCustomToolsOptions = SubagentToolsOptions & {
  includeSubagents?: boolean;
  sessions?: SessionController;
  worktreeOwners?: (path: string) => WorktreeOwner[];
};

export const createStartCustomTools = (options?: StartCustomToolsOptions) => [
  ...(options ? createFffTools({ cwd: options.cwd }) : []),
  ...(options
    ? createWorktreeTools({ cwd: options.cwd, ...(options.worktreeOwners ? { owners: options.worktreeOwners } : {}) })
    : []),
  ...(options?.sessions ? createSessionTools({ sessions: options.sessions }) : []),
  ...createBrowserTools(),
  ...(options ? createWebSearchTools() : []),
  ...(options && options.includeSubagents !== false ? createSubagentTools(options) : [])
];
