export const normalizeWorkspacePath = (workspacePath: string) => workspacePath.replace(/[/\\]+$/u, '');

export const workspaceDisplayName = (workspacePath: string) => {
  const cleanPath = normalizeWorkspacePath(workspacePath);
  return cleanPath.split(/[/\\]/u).filter(Boolean).at(-1) || workspacePath;
};
