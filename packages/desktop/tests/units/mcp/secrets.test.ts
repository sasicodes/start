import type { McpServer } from '@main/mcp/config';
import { missingServerVars, readMcpSecret, resolveServerVar, writeMcpSecret } from '@main/mcp/secrets';
import { beforeEach, describe, expect, it } from 'vitest';
import { resetStorage } from '../../fakes/storage.js';

const linear: McpServer = {
  kind: 'remote',
  name: 'linear',
  origin: 'global',
  url: 'https://mcp.linear.app/mcp',
  headers: { Authorization: `Bearer \${LINEAR_TOKEN}` }
};

describe('mcp secrets', () => {
  beforeEach(() => {
    resetStorage();
    delete process.env.LINEAR_TOKEN;
  });

  it('stores secrets encrypted and round-trips them', () => {
    expect(writeMcpSecret('linear', 'LINEAR_TOKEN', 'lin_123')).toBe(true);
    expect(readMcpSecret('linear', 'LINEAR_TOKEN')).toBe('lin_123');
  });

  it('clears a secret when saving an empty value', () => {
    writeMcpSecret('linear', 'LINEAR_TOKEN', 'lin_123');
    writeMcpSecret('linear', 'LINEAR_TOKEN', '  ');

    expect(readMcpSecret('linear', 'LINEAR_TOKEN')).toBe('');
  });

  it('prefers the secret store over the process environment', () => {
    process.env.LINEAR_TOKEN = 'from-env';
    expect(resolveServerVar('linear', 'LINEAR_TOKEN')).toBe('from-env');

    writeMcpSecret('linear', 'LINEAR_TOKEN', 'from-store');
    expect(resolveServerVar('linear', 'LINEAR_TOKEN')).toBe('from-store');
  });

  it('reports missing variables until one source provides them', () => {
    expect(missingServerVars(linear)).toEqual(['LINEAR_TOKEN']);

    writeMcpSecret('linear', 'LINEAR_TOKEN', 'lin_123');
    expect(missingServerVars(linear)).toEqual([]);
  });
});
