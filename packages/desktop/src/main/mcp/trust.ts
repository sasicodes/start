import { type McpServer, serverVarNames } from '@main/mcp/config';
import { needsWorkspaceTrust, setWorkspaceMcpTrust, workspaceMcpTrust } from '@main/mcp/state';
import electron from 'electron';

const { dialog } = electron;

const prompts = new Map<string, Promise<void>>();

const serverLine = (server: McpServer) => {
  const vars = serverVarNames(server);
  const command = server.kind === 'stdio' ? [server.command, ...server.args].join(' ') : server.url;
  return vars.length > 0 ? `${server.name}: ${command} (receives ${vars.join(', ')})` : `${server.name}: ${command}`;
};

export const ensureWorkspaceTrust = async (workspacePath: string, servers: McpServer[]): Promise<void> => {
  const undecided = workspaceMcpTrust(workspacePath) === undefined ? servers.filter(needsWorkspaceTrust) : [];
  if (undecided.length === 0) return;

  const pending = prompts.get(workspacePath);
  if (pending) return pending;

  const prompt = dialog
    .showMessageBox({
      cancelId: 0,
      defaultId: 1,
      type: 'warning',
      buttons: ['Not now', 'Allow'],
      message: 'Run MCP servers from this project?',
      detail: undecided.map(serverLine).join('\n')
    })
    .then((result) => {
      setWorkspaceMcpTrust(workspacePath, result.response === 1);
    })
    .catch(() => {})
    .finally(() => {
      prompts.delete(workspacePath);
    });

  prompts.set(workspacePath, prompt);
  return prompt;
};
