import { stat } from 'node:fs/promises';
import path from 'node:path';
import { relativeInside } from '@main/search/path';

export const directoryExists = async (workspacePath: string) => {
  try {
    return (await stat(workspacePath)).isDirectory();
  } catch {
    return false;
  }
};

export const normalizeWorkspacePath = (workspacePath: string) => workspacePath.replace(/[/\\]+$/u, '');

export const resolveInside = (cwd: string, relativePath: string) => {
  const base = path.resolve(cwd);
  const absolute = path.resolve(base, relativePath);
  return relativeInside(base, absolute) !== null ? absolute : '';
};

export const workspaceDisplayName = (workspacePath: string) => {
  const cleanPath = normalizeWorkspacePath(workspacePath);
  return cleanPath.split(/[/\\]/u).filter(Boolean).at(-1) || workspacePath;
};
