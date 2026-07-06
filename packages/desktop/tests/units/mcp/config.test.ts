import { expandServerValue, expandServerVars, mergeMcpServers, parseMcpConfig } from '@main/mcp/config';
import { describe, expect, it } from 'vitest';

describe('mcp config', () => {
  it('parses stdio and remote servers from the standard shape', () => {
    const servers = parseMcpConfig(
      JSON.stringify({
        mcpServers: {
          github: { command: 'npx', args: ['-y', 'server-github'], env: { TOKEN: `\${GITHUB_TOKEN}` } },
          linear: { url: 'https://mcp.linear.app/mcp', headers: { Authorization: `Bearer \${LINEAR_TOKEN}` } }
        }
      }),
      'global'
    );

    expect(servers).toEqual([
      {
        name: 'github',
        origin: 'global',
        kind: 'stdio',
        command: 'npx',
        args: ['-y', 'server-github'],
        env: { TOKEN: `\${GITHUB_TOKEN}` }
      },
      {
        name: 'linear',
        origin: 'global',
        kind: 'remote',
        url: 'https://mcp.linear.app/mcp',
        headers: { Authorization: `Bearer \${LINEAR_TOKEN}` }
      }
    ]);
  });

  it('drops invalid entries and tolerates broken files', () => {
    const servers = parseMcpConfig(
      JSON.stringify({ mcpServers: { ok: { command: 'echo' }, bad: { command: '' }, worse: 42 } }),
      'project'
    );

    expect(servers.map((server) => server.name)).toEqual(['ok']);
    expect(parseMcpConfig('not json', 'global')).toEqual([]);
    expect(parseMcpConfig('', 'global')).toEqual([]);
  });

  it('merges by name with project servers winning', () => {
    const merged = mergeMcpServers(
      parseMcpConfig(
        JSON.stringify({ mcpServers: { shared: { command: 'global-cmd' }, solo: { command: 'a' } } }),
        'global'
      ),
      parseMcpConfig(JSON.stringify({ mcpServers: { shared: { command: 'project-cmd' } } }), 'project')
    );

    expect(merged.map((server) => [server.name, server.origin])).toEqual([
      ['shared', 'project'],
      ['solo', 'global']
    ]);
  });

  it('expands placeholder variables', () => {
    const [server] = parseMcpConfig(
      JSON.stringify({
        mcpServers: { db: { command: 'db', env: { URL: `\${DB_URL}`, MODE: 'ro', KEY: `\${DB_KEY}` } } }
      }),
      'global'
    );
    if (server?.kind !== 'stdio') throw new Error('Expected a stdio server.');

    expect(expandServerVars(server.env, (name) => (name === 'DB_URL' ? 'postgres://x' : ''))).toEqual({
      URL: 'postgres://x',
      MODE: 'ro',
      KEY: ''
    });
  });

  it('expands remote URL placeholders', () => {
    const [server] = parseMcpConfig(
      JSON.stringify({ mcpServers: { exa: { url: `https://mcp.exa.ai/mcp?exaApiKey=\${EXA_API_KEY}` } } }),
      'global'
    );

    expect(
      expandServerValue(server?.kind === 'remote' ? server.url : '', (name) => `${name.toLowerCase()}-value`)
    ).toBe('https://mcp.exa.ai/mcp?exaApiKey=exa_api_key-value');
  });
});
