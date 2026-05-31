import { createBrowserTools } from '@main/providers/tools/browser';
import { createSubagentTools } from '@main/providers/tools/subagents';
import { createWebSearchTools, type CreateWebSearchToolsOptions } from '@main/providers/tools/search/index';

type SubagentToolsOptions = Parameters<typeof createSubagentTools>[0];

type StartCustomToolsOptions = SubagentToolsOptions &
  CreateWebSearchToolsOptions & {
    includeSubagents?: boolean;
  };

export const createStartCustomTools = (options?: StartCustomToolsOptions) => [
  ...createBrowserTools(),
  ...(options ? createWebSearchTools({ model: options.model, modelRegistry: options.modelRegistry }) : []),
  ...(options && options.includeSubagents !== false ? createSubagentTools(options) : [])
];
