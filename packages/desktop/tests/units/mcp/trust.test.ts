import type { McpServer } from '@main/mcp/config';
import { ensureWorkspaceTrust } from '@main/mcp/trust';
import { beforeEach, describe, expect, it } from 'vitest';
import { dialog, resetDialog, setDialogResponse } from '../../fakes/electron.js';
import { getStorageSnapshot, resetStorage } from '../../fakes/storage.js';

const projectStdio: McpServer = {
  kind: 'stdio',
  name: 'repo-tools',
  origin: 'project',
  command: 'npx',
  args: ['-y', 'repo-tools'],
  env: { TOKEN: `\${REPO_TOKEN}` }
};

const globalStdio: McpServer = { ...projectStdio, name: 'global-tools', origin: 'global' };

const projectRemote: McpServer = {
  kind: 'remote',
  name: 'linear',
  origin: 'project',
  url: 'https://mcp.linear.app/mcp',
  headers: {}
};

describe('mcp workspace trust', () => {
  beforeEach(() => {
    resetDialog();
    resetStorage();
  });

  it('prompts only for project stdio servers and lists command and variable names', async () => {
    setDialogResponse(1);

    await ensureWorkspaceTrust('/tmp/workspace', [projectStdio, globalStdio, projectRemote]);

    expect(dialog.calls).toHaveLength(1);
    expect(dialog.calls[0]?.[0]).toMatchObject({
      detail: 'repo-tools: npx -y repo-tools (receives REPO_TOKEN)'
    });
    expect(getStorageSnapshot().mcpWorkspaceTrust).toEqual({ '/tmp/workspace': true });
  });

  it('skips the prompt when no project stdio servers exist', async () => {
    await ensureWorkspaceTrust('/tmp/workspace', [globalStdio, projectRemote]);

    expect(dialog.calls).toHaveLength(0);
    expect(getStorageSnapshot().mcpWorkspaceTrust).toBeUndefined();
  });

  it('shares one prompt across concurrent callers', async () => {
    setDialogResponse(1);

    await Promise.all([
      ensureWorkspaceTrust('/tmp/workspace', [projectStdio]),
      ensureWorkspaceTrust('/tmp/workspace', [projectStdio])
    ]);

    expect(dialog.calls).toHaveLength(1);
  });

  it('persists a declined decision and never asks again', async () => {
    setDialogResponse(0);
    await ensureWorkspaceTrust('/tmp/workspace', [projectStdio]);

    await ensureWorkspaceTrust('/tmp/workspace', [projectStdio]);

    expect(dialog.calls).toHaveLength(1);
    expect(getStorageSnapshot().mcpWorkspaceTrust).toEqual({ '/tmp/workspace': false });
  });
});
