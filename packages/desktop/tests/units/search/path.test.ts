import { homedir } from 'node:os';
import path from 'node:path';
import { cleanRelativePath, relativeInside, toPosixPath, workspaceRelativePath } from '@main/search/path';
import { describe, expect, it } from 'vitest';

describe('file search path helpers', () => {
  it('normalizes paths into clean relative posix paths', () => {
    expect(cleanRelativePath('./src//main/')).toBe('src/main');
    expect(cleanRelativePath('/src/main')).toBe('src/main');
    expect(toPosixPath(path.join('src', 'main', 'chat.ts'))).toBe('src/main/chat.ts');
  });

  it('keeps only paths inside the requested base path', () => {
    const basePath = path.join(path.sep, 'repo', 'packages', 'desktop');

    expect(relativeInside(basePath, path.join(basePath, 'src', 'chat.ts'))).toBe('src/chat.ts');
    expect(relativeInside(basePath, path.join(path.sep, 'repo', 'packages', 'web', 'src', 'chat.ts'))).toBeNull();
  });

  it('maps absolute and home paths into workspace-relative paths', () => {
    const basePath = path.join(path.sep, 'repo', 'packages', 'desktop');

    expect(workspaceRelativePath(basePath)).toBe('');
    expect(workspaceRelativePath(basePath, basePath)).toBe('');
    expect(workspaceRelativePath(basePath, 'src/main')).toBe('src/main');
    expect(workspaceRelativePath(basePath, path.join(basePath, 'src'))).toBe('src');
    expect(workspaceRelativePath(homedir(), '~/projects')).toBe('projects');
  });

  it('rejects absolute paths outside the workspace so callers fall back', () => {
    const basePath = path.join(path.sep, 'repo', 'packages', 'desktop');

    expect(workspaceRelativePath(basePath, '~')).toBeNull();
    expect(workspaceRelativePath(basePath, path.join(path.sep, 'etc'))).toBeNull();
    expect(workspaceRelativePath(basePath, path.join(path.sep, 'repo', 'packages', 'web'))).toBeNull();
  });
});
