import { stat } from 'node:fs/promises';
import path from 'node:path';
import { relativeInside } from '@main/search/path';

type DirectoryStatus = 'directory' | 'missing' | 'other' | 'unavailable';

const missingDirectoryErrorCodes = new Set(['ENOENT', 'ENOTDIR']);

const errorCode = (error: unknown) => {
  if (typeof error !== 'object' || error === null || !('code' in error)) return '';
  const code = error.code;
  return typeof code === 'string' ? code : '';
};

export const directoryStatus = async (workspacePath: string): Promise<DirectoryStatus> => {
  try {
    return (await stat(workspacePath)).isDirectory() ? 'directory' : 'other';
  } catch (error) {
    return missingDirectoryErrorCodes.has(errorCode(error)) ? 'missing' : 'unavailable';
  }
};

export const directoryExists = async (workspacePath: string) => (await directoryStatus(workspacePath)) === 'directory';

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
