import type { McpServer } from '@main/mcp/config';
import { readStartState, updateStartState } from '@main/storage';

export const mcpServerEnabled = (name: string) => !readStartState().mcpDisabledServers?.includes(name);

export const setMcpServerEnabled = (name: string, enabled: boolean) => {
  const disabled = new Set(readStartState().mcpDisabledServers ?? []);
  if (enabled) disabled.delete(name);
  else disabled.add(name);
  updateStartState({ mcpDisabledServers: [...disabled] });
};

export const workspaceMcpTrust = (workspacePath: string): boolean | undefined =>
  readStartState().mcpWorkspaceTrust?.[workspacePath];

export const setWorkspaceMcpTrust = (workspacePath: string, trusted: boolean) => {
  updateStartState({ mcpWorkspaceTrust: { ...readStartState().mcpWorkspaceTrust, [workspacePath]: trusted } });
};

export const needsWorkspaceTrust = (server: McpServer) => server.kind === 'stdio' && server.origin === 'project';

export const trustedForWorkspace = (server: McpServer, workspacePath: string) =>
  !needsWorkspaceTrust(server) || workspaceMcpTrust(workspacePath) === true;
