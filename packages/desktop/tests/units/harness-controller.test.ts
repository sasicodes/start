import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ExtensionAPI, ToolDefinition } from '@earendil-works/pi-coding-agent';
import { createHarnessController } from '@main/harness/controller';
import { harnessToolsDir } from '@main/harness/discover';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({ state: {} as Record<string, unknown> }));
vi.mock('@main/storage', () => ({
  readStartState: () => db.state,
  updateStartState: (patch: Record<string, unknown>) => {
    db.state = { ...db.state, ...patch };
    return db.state;
  }
}));

let dir = '';

beforeEach(async () => {
  db.state = {};
  dir = await mkdtemp(join(tmpdir(), 'harness-ctrl-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const toolCode = (name: string) =>
  `export default { name: '${name}', label: '${name}', description: 'x', parameters: { type: 'object', properties: {}, required: [] }, execute: async () => ({ content: [{ type: 'text', text: 'ok' }] }) };`;

interface Harness {
  exec: (name: string, args: Record<string, unknown>) => Promise<string>;
  active: () => string[];
  registeredNames: () => string[];
  restore: () => Promise<void>;
  body: () => string;
}

const mountController = (builtins: string[] | boolean = []): Harness => {
  const builtinNames = Array.isArray(builtins) ? builtins : [];
  const persist = Array.isArray(builtins) ? true : builtins;
  const registered = new Map<string, ToolDefinition>(
    builtinNames.map((name) => [name, { name, execute: async () => ({ content: [] }) } as unknown as ToolDefinition])
  );
  let active: string[] = ['read', 'edit', ...builtinNames];

  const pi = {
    registerTool: (tool: ToolDefinition) => registered.set(tool.name, tool),
    getAllTools: () => [...registered.values()],
    getActiveTools: () => active,
    setActiveTools: (names: string[]) => {
      active = names;
    }
  } as unknown as ExtensionAPI;

  const controller = createHarnessController({ harnessDir: dir, persist });
  controller.extension(pi);

  return {
    active: () => active,
    body: () => controller.getBody(),
    restore: () => controller.restore(),
    registeredNames: () => [...registered.keys()],
    exec: async (name, args) => {
      const tool = registered.get(name);
      if (!tool?.execute) throw new Error(`missing tool ${name}`);
      const result = await tool.execute('id', args as never, undefined, undefined, {} as never);
      return result.content.map((part) => ('text' in part ? part.text : '')).join('');
    }
  };
};

describe('harness controller', () => {
  it('creates a harness with a tool and activates it after switching', async () => {
    const harness = mountController();

    const created = await harness.exec('create_harness', {
      name: 'ml-instructor',
      description: 'Teaches ML.',
      body: 'You teach ML.',
      extensions: [{ name: 'lookup', code: toolCode('lookup') }]
    });
    expect(created).toContain('Switch to it');
    expect(harness.active()).toEqual(['read', 'edit']);
    await expect(stat(join(harnessToolsDir(dir, 'ml-instructor'), 'lookup.mjs'))).resolves.toBeTruthy();

    const switched = await harness.exec('switch_harness', { name: 'ml-instructor' });
    expect(switched).toContain('Activated 1 extension(s)');
    expect(harness.active()).toContain('lookup');
  });

  it('adds and activates a tool on the default harness in real time', async () => {
    const harness = mountController();

    const added = await harness.exec('add_extension', { harness: 'default', name: 'ping', code: toolCode('ping') });
    expect(added).toContain('activated it');
    expect(harness.active()).toContain('ping');
    expect(harness.registeredNames()).toContain('ping');
  });

  it('rejects a bad tool name and reports missing harnesses', async () => {
    const harness = mountController();

    expect(await harness.exec('add_extension', { harness: 'default', name: 'BadName', code: 'x' })).toContain(
      'kebab-case'
    );
    expect(await harness.exec('add_extension', { harness: 'ghost', name: 'ping', code: toolCode('ping') })).toContain(
      'No harness named'
    );
  });

  it('always resolves the default harness even with an empty directory', async () => {
    const harness = mountController();
    expect(await harness.exec('switch_harness', { name: 'default' })).toContain('Switched to harness "default"');
  });

  it('does not register or activate a harness tool that collides with an existing tool name', async () => {
    const harness = mountController(['search']);
    await harness.exec('add_extension', { harness: 'default', name: 'search', code: toolCode('search') });

    expect(harness.active().filter((name) => name === 'search')).toEqual(['search']);
    expect(harness.registeredNames().filter((name) => name === 'search')).toEqual(['search']);
  });

  it('persists the switched harness and restores it on a fresh controller', async () => {
    await mountController().exec('create_harness', { name: 'research', description: 'r', body: 'You research.' });
    await mountController().exec('switch_harness', { name: 'research' });

    const restored = mountController();
    await restored.restore();
    expect(restored.body()).toBe('You research.');
  });

  it('does not restore a persisted harness when persistence is off (subagents)', async () => {
    await mountController().exec('create_harness', { name: 'research', description: 'r', body: 'You research.' });
    await mountController().exec('switch_harness', { name: 'research' });

    const subagent = mountController(false);
    await subagent.restore();
    expect(subagent.body()).toContain('expert coding assistant');
  });
});
