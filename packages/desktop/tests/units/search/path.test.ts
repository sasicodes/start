import path from 'node:path';
import { cleanRelativePath, relativeInside, toPosixPath } from '@main/search/path';
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
});
