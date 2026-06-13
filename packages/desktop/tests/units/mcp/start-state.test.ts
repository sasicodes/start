import { describe, expect, it, vi } from 'vitest';

const realStorage = await vi.importActual<typeof import('@main/storage')>('@main/storage');

describe('start state mcp parsing', () => {
  it('keeps valid mcp state and normalizes records', () => {
    const state = realStorage.parseStartState({
      mcpSecrets: { 'github/GH_TOKEN': 'encrypted' },
      mcpAuth: { linear: 'encrypted-auth' },
      mcpDisabledServers: ['linear'],
      mcpWorkspaceTrust: { '/tmp/workspace': false }
    });

    expect(state.mcpAuth).toEqual({ linear: 'encrypted-auth' });
    expect(state.mcpSecrets).toEqual({ 'github/GH_TOKEN': 'encrypted' });
    expect(state.mcpDisabledServers).toEqual(['linear']);
    expect(state.mcpWorkspaceTrust).toEqual({ '/tmp/workspace': false });
  });

  it('drops invalid mcp entries instead of failing the whole state', () => {
    const state = realStorage.parseStartState({
      mcpSecrets: { valid: 'value', '': 'dropped', broken: 42 },
      mcpDisabledServers: ['ok', '', 7],
      mcpWorkspaceTrust: { '/tmp/workspace': 'yes', '/tmp/other': true }
    });

    expect(state.mcpSecrets).toEqual({ valid: 'value' });
    expect(state.mcpDisabledServers).toEqual(['ok']);
    expect(state.mcpWorkspaceTrust).toEqual({ '/tmp/other': true });
  });

  it('omits empty mcp collections entirely', () => {
    const state = realStorage.parseStartState({ mcpSecrets: {}, mcpDisabledServers: [], mcpWorkspaceTrust: {} });

    expect(state.mcpAuth).toBeUndefined();
    expect(state.mcpSecrets).toBeUndefined();
    expect(state.mcpDisabledServers).toBeUndefined();
    expect(state.mcpWorkspaceTrust).toBeUndefined();
  });
});
