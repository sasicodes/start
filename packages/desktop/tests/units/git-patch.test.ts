import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { getGitChangeSummary, getGitChanges, getGitPatch } from '@main/git';
import { parseGitPatch } from '@renderer/shared/workspace/changes/diff/parser';
import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);

const git = (cwd: string, args: string[]) => execFileAsync('git', args, { cwd });

const withGitRepo = async (run: (cwd: string) => Promise<void>) => {
  const cwd = await mkdtemp(path.join(tmpdir(), 'start-git-patch-'));
  try {
    await git(cwd, ['init']);
    await run(cwd);
  } finally {
    await rm(cwd, { force: true, recursive: true });
  }
};

describe('getGitPatch', () => {
  it('shares a snapshot while deduplicating staged and unstaged paths', async () => {
    await withGitRepo(async (cwd) => {
      await writeFile(path.join(cwd, 'shared.txt'), 'staged\n');
      await git(cwd, ['add', 'shared.txt']);
      await writeFile(path.join(cwd, 'shared.txt'), 'staged\nworking\n');
      await writeFile(path.join(cwd, 'binary.bin'), Buffer.from([0, 1, 2]));
      const changes = await getGitChanges(cwd, true);

      expect(changes.summary).toEqual({ filesChanged: 2, insertions: 2, deletions: 0 });
      expect(changes.summary).toEqual(await getGitChangeSummary(cwd));
      expect(changes.patch).toEqual(await getGitPatch(cwd));
      expect(changes.patch?.sections.map((section) => section.kind)).toEqual(['staged', 'unstaged', 'untracked']);
      expect(changes.patch?.sections[2]?.patch).toContain('Binary files');
      expect(await getGitChanges(cwd)).toEqual({ summary: changes.summary });
    });
  });

  it('returns unavailable outside a repository', async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), 'start-git-unavailable-'));
    try {
      expect(await getGitChanges(cwd, true)).toEqual({});
    } finally {
      await rm(cwd, { force: true, recursive: true });
    }
  });

  it('includes untracked files in the all sections payload', async () => {
    await withGitRepo(async (cwd) => {
      await writeFile(path.join(cwd, 'staged.txt'), 'staged\n');
      await writeFile(path.join(cwd, 'untracked-a.txt'), 'a\n');
      await writeFile(path.join(cwd, 'untracked-b.txt'), 'b\n');
      await git(cwd, ['add', 'staged.txt']);

      const patch = await getGitPatch(cwd);
      const files = (patch?.sections ?? []).flatMap((section) => parseGitPatch(section.patch));

      expect(files.map((file) => file.displayPath).sort()).toEqual([
        'staged.txt',
        'untracked-a.txt',
        'untracked-b.txt'
      ]);
    });
  });

  it('keeps untracked file entries when the untracked diff is limited', async () => {
    await withGitRepo(async (cwd) => {
      await Promise.all(
        Array.from({ length: 65 }, async (_, index) => {
          await writeFile(path.join(cwd, `untracked-${index}.txt`), `${index}\n`);
        })
      );

      const patch = await getGitPatch(cwd);
      const untracked = patch?.sections.find((section) => section.kind === 'untracked');
      const files = parseGitPatch(untracked?.patch ?? '');

      expect(untracked?.limited).toBe(true);
      expect(untracked?.filesChanged).toBe(65);
      expect(files).toHaveLength(64);
      expect(files.every((file) => file.status === 'added')).toBe(true);
    });
  });
});
