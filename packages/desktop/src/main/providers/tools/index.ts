import { createBrowserTools } from '@main/providers/tools/browser';
import { createFffTools } from '@main/providers/tools/fff/index';
import { type CreateWebSearchToolsOptions, createWebSearchTools } from '@main/providers/tools/search/index';
import { createSubagentTools } from '@main/providers/tools/subagents';
import { createWorktreeTools } from '@main/providers/tools/worktree';

type SubagentToolsOptions = Parameters<typeof createSubagentTools>[0];

type StartCustomToolsOptions = SubagentToolsOptions &
  CreateWebSearchToolsOptions & {
    includeSubagents?: boolean;
  };

export const createStartCustomTools = (options?: StartCustomToolsOptions) => [
  ...(options ? createFffTools({ cwd: options.cwd }) : []),
  ...(options ? createWorktreeTools({ cwd: options.cwd }) : []),
  ...createBrowserTools(),
  ...(options ? createWebSearchTools({ model: options.model, modelRegistry: options.modelRegistry }) : []),
  ...(options && options.includeSubagents !== false ? createSubagentTools(options) : [])
];
