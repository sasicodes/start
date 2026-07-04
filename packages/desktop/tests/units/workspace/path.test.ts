import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { directoryExists, resolveInside } from '@main/utils/workspace';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

describe('resolveInside', () => {
  const base = path.resolve('/workspace/project');

  it('resolves a relative path that stays inside the workspace', () => {
    expect(resolveInside('/workspace/project', 'src/index.ts')).toBe(path.join(base, 'src/index.ts'));
  });

  it('returns the workspace root itself', () => {
    expect(resolveInside('/workspace/project', '.')).toBe(base);
  });

  it('rejects a path that escapes the workspace via ..', () => {
    expect(resolveInside('/workspace/project', '../secret.txt')).toBe('');
  });

  it('rejects an absolute path outside the workspace', () => {
    expect(resolveInside('/workspace/project', '/etc/passwd')).toBe('');
  });

  it('rejects a sibling directory sharing the workspace name prefix', () => {
    expect(resolveInside('/workspace/project', '../project-secrets/key')).toBe('');
  });
});

describe('directoryExists', () => {
  let dir = '';

  beforeAll(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'start-workspace-'));
    await writeFile(path.join(dir, 'file.txt'), 'hi');
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('returns true for an existing directory', async () => {
    expect(await directoryExists(dir)).toBe(true);
  });

  it('returns false for a missing path', async () => {
    expect(await directoryExists(path.join(dir, 'nope'))).toBe(false);
  });

  it('returns false when the path is a file', async () => {
    expect(await directoryExists(path.join(dir, 'file.txt'))).toBe(false);
  });
});
