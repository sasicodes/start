import { homedir } from 'node:os';
import path from 'node:path';

export const toPosixPath = (value: string) => value.split(path.sep).join('/');

export const hasGlobChars = (value: string) => /[*?[{\]}]/u.test(value);

export const cleanRelativePath = (value: string) =>
  toPosixPath(path.normalize(value || '.'))
    .replace(/^\.(?:\/|$)/u, '')
    .replace(/^\/+/u, '')
    .replace(/\/+$|^\.$/gu, '');

export const relativeInside = (basePath: string, targetPath: string): string | null => {
  const relativePath = path.relative(basePath, targetPath);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) return null;
  return cleanRelativePath(relativePath);
};

const expandHomePath = (value: string) =>
  value === '~' || value.startsWith('~/') ? path.join(homedir(), value.slice(1)) : value;

export const workspaceRelativePath = (workspaceRoot: string, value = ''): string | null => {
  const input = expandHomePath(value.trim());
  if (!path.isAbsolute(input)) return cleanRelativePath(input);
  return relativeInside(workspaceRoot, input);
};
