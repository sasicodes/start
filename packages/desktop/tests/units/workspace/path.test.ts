import path from 'node:path';
import { resolveInside } from '@main/utils/workspace';
import { describe, expect, it } from 'vitest';

describe('resolveInside', () => {
  const base = path.resolve('/workspace/project');

  it('resolves a relative path that stays inside the workspace', () => {
    expect(resolveInside('/workspace/project', 'src/index.ts')).toBe(path.join(base, 'src/index.ts'));
  });

  it('returns the workspace root itself', () => {
    expect(resolveInside('/workspace/project', '.')).toBe(base);
  });

  it('rejects a path that escapes the workspace via ..', () => {
    expect(resolveInside('/workspace/project', '../secret.txt')).toBeUndefined();
  });

  it('rejects an absolute path outside the workspace', () => {
    expect(resolveInside('/workspace/project', '/etc/passwd')).toBeUndefined();
  });

  it('rejects a sibling directory sharing the workspace name prefix', () => {
    expect(resolveInside('/workspace/project', '../project-secrets/key')).toBeUndefined();
  });
});
