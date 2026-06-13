import { readEnvironmentValue } from '@main/environment';
import { type McpServer, serverVarNames } from '@main/mcp/config';
import { resolveSecretCodec } from '@main/providers/codec';
import { readStartState, updateStartState } from '@main/storage';

const codec = resolveSecretCodec();

const secretKey = (server: string, name: string) => `${server}/${name}`;

const decryptSecret = (encrypted: string) => {
  try {
    return codec.decode(Buffer.from(encrypted, 'base64'));
  } catch {
    return '';
  }
};

export const readMcpSecret = (server: string, name: string) => {
  const encrypted = readStartState().mcpSecrets?.[secretKey(server, name)];
  return encrypted ? decryptSecret(encrypted) : '';
};

export const writeMcpSecret = (server: string, name: string, value: string): boolean => {
  if (!codec.available()) return false;

  const secrets = { ...readStartState().mcpSecrets };
  const trimmed = value.trim();

  if (trimmed) {
    secrets[secretKey(server, name)] = codec.encode(trimmed).toString('base64');
  } else {
    delete secrets[secretKey(server, name)];
  }

  updateStartState({ mcpSecrets: secrets });
  return true;
};

export const resolveServerVar = (server: string, name: string) =>
  readMcpSecret(server, name) || readEnvironmentValue(name) || '';

export const missingServerVars = (server: McpServer): string[] =>
  serverVarNames(server).filter((name) => !resolveServerVar(server.name, name));
