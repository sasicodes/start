import path from 'node:path';

export const workspaceDisplayName = (workspacePath: string) => path.basename(workspacePath) || workspacePath;
