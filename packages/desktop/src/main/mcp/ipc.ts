import { connectServer, dropServerClient, serverConnection } from '@main/mcp/clients';
import { loadMcpServers, type McpServer } from '@main/mcp/config';
import { authenticateServer, clearServerAuth, serverHasAuth } from '@main/mcp/oauth';
import { missingServerVars, writeMcpSecret } from '@main/mcp/secrets';
import { serverSnapshot } from '@main/mcp/snapshot';
import { mcpServerEnabled, setMcpServerEnabled, setWorkspaceMcpTrust, trustedForWorkspace } from '@main/mcp/state';
import type { McpServerSnapshot } from '@main/types';
import electron from 'electron';

const { ipcMain } = electron;

interface RegisterMcpIpcOptions {
  workspacePath: () => string;
}

const snapshots = async (workspacePath: string): Promise<McpServerSnapshot[]> => {
  const servers = await loadMcpServers(workspacePath);

  return servers.map((server) =>
    serverSnapshot({
      server,
      enabled: mcpServerEnabled(server.name),
      trusted: trustedForWorkspace(server, workspacePath),
      authenticated: server.kind === 'remote' && serverHasAuth(server.name),
      missingVars: missingServerVars(server),
      connection: serverConnection(server)
    })
  );
};

const findServer = async (workspacePath: string, name: string): Promise<McpServer | null> =>
  (await loadMcpServers(workspacePath)).find((server) => server.name === name) ?? null;

const connectByName = async (workspacePath: string, name: string) => {
  const server = await findServer(workspacePath, name);
  if (!server) return;

  if (server.kind === 'remote' && serverConnection(server)?.kind === 'unauthorized') {
    const authenticated = await authenticateServer(server);
    if (!authenticated) return;
    dropServerClient(name);
  }

  await connectServer(server);
};

export const registerMcpIpc = ({ workspacePath }: RegisterMcpIpcOptions) => {
  ipcMain.handle('mcp:servers', async () => snapshots(workspacePath()));

  ipcMain.handle('mcp:set-enabled', async (_event, name: string, enabled: boolean) => {
    setMcpServerEnabled(name, enabled);
    if (!enabled) dropServerClient(name);
    return snapshots(workspacePath());
  });

  ipcMain.handle('mcp:set-secret', async (_event, server: string, name: string, value: string) => {
    const ok = writeMcpSecret(server, name, value);
    if (ok) dropServerClient(server);
    return { ok, servers: await snapshots(workspacePath()) };
  });

  ipcMain.handle('mcp:connect', async (_event, name: string) => {
    await connectByName(workspacePath(), name);
    return snapshots(workspacePath());
  });

  ipcMain.handle('mcp:disconnect', async (_event, name: string) => {
    clearServerAuth(name);
    dropServerClient(name);
    return snapshots(workspacePath());
  });

  ipcMain.handle('mcp:set-workspace-trust', async (_event, trusted: boolean) => {
    setWorkspaceMcpTrust(workspacePath(), trusted);
    return snapshots(workspacePath());
  });
};
