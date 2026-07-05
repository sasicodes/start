import { stat } from 'node:fs/promises';
import path from 'node:path';
import { relativeInside } from '@main/search/path';
import * as v from 'valibot';

type DirectoryStatus = 'directory' | 'missing' | 'other' | 'unavailable';

const missingDirectoryErrorCodes = new Set(['ENOENT', 'ENOTDIR']);
const errorCodeSchema = v.object({ code: v.string() });

const errorCode = (error: unknown) => {
  const result = v.safeParse(errorCodeSchema, error);
  return result.success ? result.output.code : '';
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
