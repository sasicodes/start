import { findPathsWithRg, pathMatchesFromLines, rgFilesGlob } from '@main/providers/tools/fff/files';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const childProcessMocks = vi.hoisted(() =>
  import('../../../fakes/exec.js').then((exec) => ({ execFile: exec.createExecFileMock() }))
);

vi.mock('node:child_process', () => childProcessMocks);

vi.mock('@main/environment', () => ({ rgBinaryPath: '/bundled/rg' }));

const { execFile: execFileMock } = await childProcessMocks;

const succeedWith = (stdout: string) => {
  execFileMock.mockImplementation(
    (
      _command: string,
      _args: string[],
      _options: object,
      callback: (error: Error | null, stdout: string, stderr: string) => void
    ) => callback(null, stdout, '')
  );
};

const failWith = (error: Error & { code?: number | string }) => {
  execFileMock.mockImplementation(
    (
      _command: string,
      _args: string[],
      _options: object,
      callback: (error: Error | null, stdout: string, stderr: string) => void
    ) => callback(error, '', '')
  );
};

describe('rgFilesGlob', () => {
  it('turns fuzzy queries into recursive basename globs', () => {
    expect(rgFilesGlob('src config')).toBe('**/*src*config*');
    expect(rgFilesGlob('chat')).toBe('**/*chat*');
  });

  it('anchors bare glob patterns to any directory', () => {
    expect(rgFilesGlob('*.ts')).toBe('**/*.ts');
  });

  it('keeps path-qualified globs unchanged', () => {
    expect(rgFilesGlob('src/**/*.ts')).toBe('src/**/*.ts');
  });
});

describe('pathMatchesFromLines', () => {
  it('splits, trims empties, and caps results', () => {
    expect(pathMatchesFromLines('a.ts\nb.ts\n\nc.ts\n', 2)).toEqual([
      { path: 'a.ts', type: 'file' },
      { path: 'b.ts', type: 'file' }
    ]);
  });
});

describe('findPathsWithRg', () => {
  beforeEach(() => {
    execFileMock.mockReset();
  });

  it('lists files through the bundled rg binary', async () => {
    succeedWith('src/chat.ts\nsrc/chat/tabs.ts\n');

    const items = await findPathsWithRg({ limit: 10, cwd: '/repo', path: 'src', pattern: 'chat' });

    expect(items).toEqual([
      { path: 'src/chat.ts', type: 'file' },
      { path: 'src/chat/tabs.ts', type: 'file' }
    ]);
    expect(execFileMock).toHaveBeenCalledWith(
      '/bundled/rg',
      ['--files', '--iglob', '**/*chat*', '--', 'src'],
      expect.objectContaining({ cwd: '/repo', timeout: 10_000 }),
      expect.any(Function)
    );
  });

  it('passes cancellation through to rg', async () => {
    succeedWith('src/chat.ts\n');
    const controller = new AbortController();

    await findPathsWithRg({ limit: 10, cwd: '/repo', pattern: 'chat', signal: controller.signal });

    expect(execFileMock).toHaveBeenCalledWith(
      '/bundled/rg',
      ['--files', '--iglob', '**/*chat*'],
      expect.objectContaining({ signal: controller.signal }),
      expect.any(Function)
    );
  });

  it('treats a no-match exit as an empty result', async () => {
    failWith(Object.assign(new Error('no matches'), { code: 1 }));

    expect(await findPathsWithRg({ limit: 10, cwd: '/repo', pattern: 'nope' })).toEqual([]);
  });

  it('returns null when rg cannot run', async () => {
    failWith(Object.assign(new Error('spawn failed'), { code: 'ENOENT' }));

    expect(await findPathsWithRg({ limit: 10, cwd: '/repo', pattern: 'chat' })).toBeNull();
  });
});
