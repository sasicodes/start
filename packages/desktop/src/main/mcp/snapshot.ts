import type { McpConnection } from '@main/mcp/clients';
import type { McpServer } from '@main/mcp/config';
import type { McpServerSnapshot, McpServerStatus } from '@main/types';

export interface SnapshotInput {
  server: McpServer;
  enabled: boolean;
  trusted: boolean;
  authenticated: boolean;
  missingVars: string[];
  connection: McpConnection | null;
}

const serverStatus = ({ enabled, trusted, missingVars, connection }: SnapshotInput): McpServerStatus => {
  if (!enabled) return 'disabled';
  if (!trusted) return 'untrusted';
  if (missingVars.length > 0) return 'missing-vars';
  if (!connection) return 'idle';
  if (connection.kind === 'connected') return 'connected';
  if (connection.kind === 'unauthorized') return 'needs-auth';
  return 'error';
};

export const serverSnapshot = (input: SnapshotInput): McpServerSnapshot => {
  const { server, enabled, authenticated, missingVars, connection } = input;
  const status = serverStatus(input);

  return {
    status,
    enabled,
    missingVars,
    name: server.name,
    kind: server.kind,
    origin: server.origin,
    ...(authenticated ? { authenticated } : {}),
    ...(connection?.kind === 'connected' ? { toolCount: connection.tools.length } : {}),
    ...(status === 'error' && connection?.kind === 'failed' ? { error: connection.error } : {})
  };
};
