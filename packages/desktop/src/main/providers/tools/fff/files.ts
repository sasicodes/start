import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { rgBinaryPath } from '@main/environment';
import { fallbackFindPattern } from '@main/providers/tools/fff/format';
import type { WorkspacePathMatch } from '@main/search/types';
import * as v from 'valibot';

const run = promisify(execFile);
const rgTimeoutMs = 10_000;
const rgMaxBufferBytes = 8 * 1024 * 1024;

const noMatchesSchema = v.object({ code: v.literal(1) });

interface RgFindOptions {
  cwd: string;
  path?: string;
  limit: number;
  pattern: string;
  signal?: AbortSignal | null;
}

export const rgFilesGlob = (pattern: string) => {
  const glob = fallbackFindPattern(pattern.trim());
  return glob.includes('/') ? glob : `**/${glob}`;
};

export const pathMatchesFromLines = (stdout: string, limit: number): WorkspacePathMatch[] =>
  stdout
    .split('\n')
    .filter(Boolean)
    .slice(0, limit)
    .map((line) => ({ path: line, type: 'file' as const }));

export const findPathsWithRg = async ({
  cwd,
  path,
  limit,
  signal,
  pattern
}: RgFindOptions): Promise<WorkspacePathMatch[] | null> => {
  const args = ['--files', '--iglob', rgFilesGlob(pattern), ...(path ? ['--', path] : [])];

  try {
    const { stdout } = await run(rgBinaryPath || 'rg', args, {
      cwd,
      timeout: rgTimeoutMs,
      maxBuffer: rgMaxBufferBytes,
      ...(signal ? { signal } : {})
    });
    return pathMatchesFromLines(stdout, limit);
  } catch (error) {
    if (v.safeParse(noMatchesSchema, error).success) return [];
    return null;
  }
};
