import { createBrowserTools } from '@main/providers/tools/browser';
import { createFffTools } from '@main/providers/tools/fff/index';
import { type CreateWebSearchToolsOptions, createWebSearchTools } from '@main/providers/tools/search/index';
import { type SessionController, createSessionTools } from '@main/providers/tools/sessions';
import { createSubagentTools } from '@main/providers/tools/subagents';

type SubagentToolsOptions = Parameters<typeof createSubagentTools>[0];

type StartCustomToolsOptions = SubagentToolsOptions &
  CreateWebSearchToolsOptions & {
    includeSubagents?: boolean;
    sessions?: SessionController;
  };

export const createStartCustomTools = (options?: StartCustomToolsOptions) => [
  ...(options ? createFffTools({ cwd: options.cwd }) : []),
  ...(options?.sessions ? createSessionTools({ sessions: options.sessions }) : []),
  ...createBrowserTools(),
  ...(options ? createWebSearchTools({ model: options.model, modelRegistry: options.modelRegistry }) : []),
  ...(options && options.includeSubagents !== false ? createSubagentTools(options) : [])
];
