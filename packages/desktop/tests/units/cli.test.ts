import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { cliWorkspaceFlag, parseCliAdditionalData, parseCliLaunchArgv, resolveCliWorkspacePath } from '@main/cli/args';
import { cliInstallScriptSource, cliWrapperSource } from '@main/cli/install';

describe('cli args', () => {
  it('parses workspace launch arguments', () => {
    expect(parseCliLaunchArgv(['/Applications/Start.app/Contents/MacOS/Start'])).toBeNull();
    expect(parseCliLaunchArgv(['start', cliWorkspaceFlag, '.'])).toEqual({ workspacePath: '.' });
    expect(parseCliLaunchArgv(['start', cliWorkspaceFlag, '  '])).toBeNull();
  });

  it('parses single-instance additional data with validation', () => {
    expect(parseCliAdditionalData({ start: { workspacePath: '/tmp/project' } })).toEqual({
      workspacePath: '/tmp/project'
    });
    expect(parseCliAdditionalData({ start: { workspacePath: '' } })).toBeNull();
    expect(parseCliAdditionalData({ start: { workspacePath: 42 } })).toBeNull();
  });

  it('requires an existing directory workspace', async () => {
    const root = join(tmpdir(), `start-cli-test-${process.pid}`);
    await mkdir(root, { recursive: true });

    try {
      await expect(resolveCliWorkspacePath('.', root)).resolves.toEqual({ ok: true, workspacePath: root });
      await expect(resolveCliWorkspacePath('missing', root)).resolves.toMatchObject({
        ok: false,
        workspacePath: join(root, 'missing')
      });
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });
});

describe('cli installer', () => {
  it('builds a validating shell wrapper', () => {
    const source = cliWrapperSource('/Applications/Start.app');
    expect(source).toContain('usage: start [path]');
    expect(source).toContain(cliWorkspaceFlag);
    expect(source).toContain('workspace path does not exist or is not a directory');
    expect(source).toContain('exec open -n "$app_bundle" --args');
  });

  it('cleans up installer temp files on failure', () => {
    const source = cliInstallScriptSource('/Applications/Start.app');
    expect(source).toContain('trap \'rm -f "$tmp_path"\' EXIT');
    expect(source).toContain('mv "$tmp_path" "$bin_path"');
  });
});
