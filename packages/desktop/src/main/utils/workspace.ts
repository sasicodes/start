import path from 'node:path';

export const normalizeWorkspacePath = (workspacePath: string) => workspacePath.replace(/[/\\]+$/u, '');

export const resolveInside = (cwd: string, relativePath: string) => {
  const base = path.resolve(cwd);
  const absolute = path.resolve(base, relativePath);
  return absolute === base || absolute.startsWith(base + path.sep) ? absolute : '';
};

export const workspaceDisplayName = (workspacePath: string) => {
  const cleanPath = normalizeWorkspacePath(workspacePath);
  return cleanPath.split(/[/\\]/u).filter(Boolean).at(-1) || workspacePath;
};
