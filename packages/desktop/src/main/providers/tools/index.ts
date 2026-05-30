import { createBrowserTools } from '@main/providers/tools/browser';
import { createSubagentTools } from '@main/providers/tools/subagents';

type SubagentToolsOptions = Parameters<typeof createSubagentTools>[0];

export const createStartCustomTools = (options?: SubagentToolsOptions) => [
  ...createBrowserTools(),
  ...(options ? createSubagentTools(options) : [])
];
