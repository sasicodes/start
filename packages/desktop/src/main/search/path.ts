import path from 'node:path';

export const toPosixPath = (value: string) => value.split(path.sep).join('/').replace(/\/+/gu, '/');

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
