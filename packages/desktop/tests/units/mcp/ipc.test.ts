import type { McpConnection } from '@main/mcp/clients';
import type { McpServer } from '@main/mcp/config';
import { registerMcpIpc } from '@main/mcp/ipc';
import { writeMcpSecret } from '@main/mcp/secrets';
import { setMcpServerEnabled, setWorkspaceMcpTrust } from '@main/mcp/state';
import type { McpServerSnapshot } from '@main/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { invokeIpc } from '../../fakes/electron.js';
import { resetStorage } from '../../fakes/storage.js';

const clientsMock = vi.hoisted(() => ({
  connectServer: vi.fn(),
  callServerTool: vi.fn(),
  pruneMcpClients: vi.fn(),
  dropServerClient: vi.fn(),
  serverConnection: vi.fn()
}));

const oauthMock = vi.hoisted(() => ({
  serverHasAuth: vi.fn(),
  clearServerAuth: vi.fn(),
  authenticateServer: vi.fn()
}));

const configMock = vi.hoisted(() => ({
  servers: [] as McpServer[]
}));

vi.mock('@main/mcp/clients', () => clientsMock);
vi.mock('@main/mcp/oauth', () => oauthMock);

vi.mock('@main/mcp/config', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@main/mcp/config')>()),
  loadMcpServers: async () => configMock.servers
}));

const github: McpServer = {
  kind: 'stdio',
  name: 'github',
  origin: 'global',
  command: 'npx',
  args: [],
  env: { TOKEN: `\${GH_TOKEN}` }
};

const linear: McpServer = {
  kind: 'remote',
  name: 'linear',
  origin: 'project',
  url: 'https://mcp.linear.app/mcp',
  headers: {}
};

registerMcpIpc({ workspacePath: () => '/tmp/workspace' });

const listServers = async () => (await invokeIpc('mcp:servers')) as McpServerSnapshot[];

const snapshotOf = async (name: string) => (await listServers()).find((server) => server.name === name);

describe('mcp ipc', () => {
  beforeEach(() => {
    resetStorage();
    delete process.env.GH_TOKEN;
    configMock.servers = [github, linear];
    clientsMock.dropServerClient.mockReset();
    clientsMock.serverConnection.mockReset().mockReturnValue(null);
    clientsMock.connectServer.mockReset().mockResolvedValue({ kind: 'failed', error: 'unreachable' });
    oauthMock.serverHasAuth.mockReset().mockReturnValue(false);
    oauthMock.clearServerAuth.mockReset();
    oauthMock.authenticateServer.mockReset().mockResolvedValue(true);
  });

  it('snapshots servers with status, origin, and missing variables', async () => {
    const servers = await listServers();

    expect(servers).toHaveLength(2);
    expect(servers[0]).toMatchObject({
      name: 'github',
      kind: 'stdio',
      origin: 'global',
      status: 'missing-vars',
      missingVars: ['GH_TOKEN']
    });
    expect(servers[1]).toMatchObject({ name: 'linear', kind: 'remote', origin: 'project', status: 'idle' });
  });

  it('reflects connection states from the client cache', async () => {
    const connectionByName: Record<string, McpConnection> = {
      github: { kind: 'connected', tools: [{ name: 'a', description: '', inputSchema: {} }] },
      linear: { kind: 'unauthorized' }
    };
    process.env.GH_TOKEN = 'gh_x';
    clientsMock.serverConnection.mockImplementation((server: McpServer) => connectionByName[server.name]);

    expect(await snapshotOf('github')).toMatchObject({ status: 'connected', toolCount: 1 });
    expect(await snapshotOf('linear')).toMatchObject({ status: 'needs-auth' });
  });

  it('toggles servers and drops disabled clients', async () => {
    const servers = (await invokeIpc('mcp:set-enabled', 'github', false)) as McpServerSnapshot[];

    expect(servers.find((server) => server.name === 'github')?.status).toBe('disabled');
    expect(clientsMock.dropServerClient).toHaveBeenCalledWith('github');

    await invokeIpc('mcp:set-enabled', 'github', true);
    expect(await snapshotOf('github')).toMatchObject({ enabled: true });
  });

  it('stores secrets and resets the server client', async () => {
    const result = (await invokeIpc('mcp:set-secret', 'github', 'GH_TOKEN', 'gh_123')) as {
      ok: boolean;
      servers: McpServerSnapshot[];
    };

    expect(result.ok).toBe(true);
    expect(clientsMock.dropServerClient).toHaveBeenCalledWith('github');
    expect(result.servers.find((server) => server.name === 'github')?.missingVars).toEqual([]);
  });

  it('runs authentication before connecting unauthorized remote servers', async () => {
    clientsMock.serverConnection.mockImplementation((server: McpServer) =>
      server.name === 'linear' ? ({ kind: 'unauthorized' } satisfies McpConnection) : null
    );

    await invokeIpc('mcp:connect', 'linear');

    expect(oauthMock.authenticateServer).toHaveBeenCalledWith(linear);
    expect(clientsMock.dropServerClient).toHaveBeenCalledWith('linear');
    expect(clientsMock.connectServer).toHaveBeenCalledWith(linear);
  });

  it('clears authentication on disconnect', async () => {
    await invokeIpc('mcp:disconnect', 'linear');

    expect(oauthMock.clearServerAuth).toHaveBeenCalledWith('linear');
    expect(clientsMock.dropServerClient).toHaveBeenCalledWith('linear');
  });

  it('marks untrusted project servers and applies workspace trust updates', async () => {
    configMock.servers = [{ ...github, origin: 'project' }];
    delete process.env.GH_TOKEN;
    writeMcpSecret('github', 'GH_TOKEN', 'gh_x');

    expect(await snapshotOf('github')).toMatchObject({ status: 'untrusted' });

    const servers = (await invokeIpc('mcp:set-workspace-trust', true)) as McpServerSnapshot[];
    expect(servers[0]?.status).toBe('idle');
  });

  it('keeps explicit state helpers consistent with snapshots', async () => {
    setMcpServerEnabled('linear', false);
    setWorkspaceMcpTrust('/tmp/workspace', false);
    configMock.servers = [{ ...github, origin: 'project' }, linear];
    process.env.GH_TOKEN = 'gh_x';

    expect(await snapshotOf('github')).toMatchObject({ status: 'untrusted' });
    expect(await snapshotOf('linear')).toMatchObject({ status: 'disabled', enabled: false });
  });
});
