import type { McpServer } from '@main/mcp/config';
import { type SnapshotInput, serverSnapshot } from '@main/mcp/snapshot';
import { describe, expect, it } from 'vitest';

const server: McpServer = {
  kind: 'stdio',
  name: 'github',
  origin: 'project',
  command: 'npx',
  args: [],
  env: {}
};

const input = (overrides: Partial<SnapshotInput>): SnapshotInput => ({
  server,
  enabled: true,
  trusted: true,
  authenticated: false,
  missingVars: [],
  connection: null,
  ...overrides
});

describe('mcp snapshot', () => {
  it('ranks status by disabled, trust, vars, then connection', () => {
    expect(serverSnapshot(input({ enabled: false })).status).toBe('disabled');
    expect(serverSnapshot(input({ trusted: false })).status).toBe('untrusted');
    expect(serverSnapshot(input({ missingVars: ['TOKEN'] })).status).toBe('missing-vars');
    expect(serverSnapshot(input({})).status).toBe('idle');
    expect(serverSnapshot(input({ connection: { kind: 'unauthorized' } })).status).toBe('needs-auth');
    expect(serverSnapshot(input({ connection: { kind: 'failed', error: 'boom' } }))).toMatchObject({
      status: 'error',
      error: 'boom'
    });
  });

  it('reports tool counts for connected servers', () => {
    const snapshot = serverSnapshot(
      input({ connection: { kind: 'connected', tools: [{ name: 'a', description: '', inputSchema: {} }] } })
    );

    expect(snapshot).toMatchObject({ status: 'connected', toolCount: 1, name: 'github', origin: 'project' });
  });
});
