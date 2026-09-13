import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { GitChangesService } from '@main/workspace/changes';
import { afterEach, describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);

const git = (cwd: string, args: string[]) => execFileAsync('git', args, { cwd });

const services: GitChangesService[] = [];

const createService = (cwd: string) => {
  const service = new GitChangesService({
    notify: () => {},
    focused: () => true,
    currentWorkspace: () => cwd
  });
  services.push(service);
  return service;
};

afterEach(() => {
  for (const service of services.splice(0)) service.dispose();
});

describe('GitChangesService', () => {
  it('retries the patch after an unavailable load instead of caching the empty result', async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), 'start-git-service-'));

    try {
      const service = createService(cwd);
      expect(await service.getPatch(cwd)).toBeUndefined();

      await git(cwd, ['init']);
      await writeFile(path.join(cwd, 'tracked.txt'), 'first\n');
      await git(cwd, ['add', 'tracked.txt']);

      const patch = await service.getPatch(cwd);

      expect(patch?.sections.map((section) => section.kind)).toEqual(['staged']);
    } finally {
      await rm(cwd, { force: true, recursive: true });
    }
  });

  it('serves the cached patch once it is loaded', async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), 'start-git-service-'));

    try {
      await git(cwd, ['init']);
      await writeFile(path.join(cwd, 'tracked.txt'), 'first\n');
      await git(cwd, ['add', 'tracked.txt']);

      const service = createService(cwd);
      const loaded = await service.getPatch(cwd);

      await writeFile(path.join(cwd, 'tracked.txt'), 'first\nsecond\n');

      expect(await service.getPatch(cwd)).toBe(loaded);
    } finally {
      await rm(cwd, { force: true, recursive: true });
    }
  });
});
