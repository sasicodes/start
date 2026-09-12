import { afterEach, describe, expect, it, vi } from 'vitest';

const childProcessMocks = vi.hoisted(() =>
  import('../fakes/exec.js').then((exec) => ({ execFile: exec.createExecFileMock() }))
);

vi.mock('node:child_process', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:child_process')>()),
  ...(await childProcessMocks)
}));

const { execFile } = await childProcessMocks;
const { getGitChanges } = await import('@main/git');

const mockGit = (failPatch = false) => {
  execFile.mockImplementation(
    (
      _command: string,
      args: string[],
      _options: object,
      callback: (error: Error | null, stdout: string, stderr: string) => void
    ) => {
      if (failPatch && args.includes('--binary')) {
        callback(new Error('patch failed'), '', '');
        return;
      }
      const output = args.includes('rev-parse') ? 'true\n' : '';
      callback(null, output, '');
    }
  );
};

afterEach(() => vi.clearAllMocks());

describe('getGitChanges', () => {
  it.each([false, true])('collects working tree statistics once with includePatch=%s', async (includePatch) => {
    mockGit();
    const changes = await getGitChanges('/repo', includePatch);
    const calls = execFile.mock.calls.map(([, args]) => args as string[]);

    expect(calls.filter((args) => args.includes('rev-parse'))).toHaveLength(1);
    expect(calls.filter((args) => args.includes('--numstat'))).toHaveLength(2);
    expect(calls.filter((args) => args.includes('--name-only'))).toHaveLength(2);
    expect(calls.filter((args) => args.includes('ls-files'))).toHaveLength(1);
    expect(calls.filter((args) => args.includes('--binary'))).toHaveLength(includePatch ? 2 : 0);
    expect(changes.summary).toEqual({ filesChanged: 0, insertions: 0, deletions: 0 });
    expect('patch' in changes).toBe(includePatch);
  });

  it('preserves statistics when patch commands fail', async () => {
    mockGit(true);
    expect(await getGitChanges('/repo', true)).toEqual({
      patch: { sections: [] },
      summary: { filesChanged: 0, insertions: 0, deletions: 0 }
    });
  });
});
