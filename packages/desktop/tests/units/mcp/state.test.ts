import type { McpServer } from '@main/mcp/config';
import { mcpServerEnabled, setMcpServerEnabled, setWorkspaceMcpTrust, trustedForWorkspace } from '@main/mcp/state';
import { beforeEach, describe, expect, it } from 'vitest';
import { resetStorage } from '../../fakes/storage.js';

const projectStdio: McpServer = {
  kind: 'stdio',
  name: 'repo-tools',
  origin: 'project',
  command: 'npx',
  args: [],
  env: {}
};

describe('mcp state', () => {
  beforeEach(() => {
    resetStorage();
  });

  it('treats servers as enabled until disabled and supports re-enabling', () => {
    expect(mcpServerEnabled('github')).toBe(true);

    setMcpServerEnabled('github', false);
    expect(mcpServerEnabled('github')).toBe(false);

    setMcpServerEnabled('github', true);
    expect(mcpServerEnabled('github')).toBe(true);
  });

  it('requires explicit trust only for project stdio servers', () => {
    expect(trustedForWorkspace(projectStdio, '/tmp/workspace')).toBe(false);
    expect(trustedForWorkspace({ ...projectStdio, origin: 'global' }, '/tmp/workspace')).toBe(true);

    setWorkspaceMcpTrust('/tmp/workspace', true);
    expect(trustedForWorkspace(projectStdio, '/tmp/workspace')).toBe(true);

    setWorkspaceMcpTrust('/tmp/workspace', false);
    expect(trustedForWorkspace(projectStdio, '/tmp/workspace')).toBe(false);
  });
});
