import { mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ExtensionAPI, ToolDefinition } from '@earendil-works/pi-coding-agent';
import { createToolController, isValidToolName } from '@main/tools/create';
import { discoverToolFiles, loadToolFiles } from '@main/tools/load';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

let dir = '';

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agent-tools-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const toolCode = (name: string, description = 'x') =>
  `export default { name: '${name}', label: '${name}', description: '${description}', parameters: { type: 'object', properties: {}, required: [] }, execute: async () => ({ content: [{ type: 'text', text: 'ok' }] }) };`;

interface Mounted {
  exec: (name: string, args: Record<string, unknown>) => Promise<string>;
  active: () => string[];
  registeredNames: () => string[];
  sessionStart: () => Promise<void>;
}

const mountController = (builtins: string[] = []): Mounted => {
  const registered = new Map<string, ToolDefinition>(
    builtins.map((name) => [name, { name, execute: async () => ({ content: [] }) } as unknown as ToolDefinition])
  );
  let active: string[] = ['read', 'edit', ...builtins];

  const handlers = new Map<string, (event?: unknown) => unknown>();
  const pi = {
    on: (event: string, handler: (event?: unknown) => unknown) => handlers.set(event, handler),
    registerTool: (tool: ToolDefinition) => registered.set(tool.name, tool),
    getAllTools: () => [...registered.values()],
    getActiveTools: () => active,
    setActiveTools: (names: string[]) => {
      active = names;
    }
  } as unknown as ExtensionAPI;

  createToolController(dir).extension(pi);

  return {
    active: () => active,
    registeredNames: () => [...registered.keys()],
    sessionStart: async () => {
      await handlers.get('session_start')?.();
    },
    exec: async (name, args) => {
      const tool = registered.get(name);
      if (!tool?.execute) throw new Error(`missing tool ${name}`);
      const result = await tool.execute('id', args as never, undefined, undefined, {} as never);
      return result.content.map((part) => ('text' in part ? part.text : '')).join('');
    }
  };
};

describe('create_tool', () => {
  it('writes the tool file and activates it immediately', async () => {
    const mounted = mountController();

    const created = await mounted.exec('create_tool', { name: 'lookup', code: toolCode('lookup') });
    expect(created).toContain('It is active now.');
    expect(mounted.active()).toContain('lookup');
    expect(mounted.registeredNames()).toContain('lookup');
    await expect(stat(join(dir, 'lookup.mjs'))).resolves.toBeTruthy();
  });

  it('rejects bad names and empty code', async () => {
    const mounted = mountController();

    expect(await mounted.exec('create_tool', { name: 'BadName', code: toolCode('x') })).toContain('kebab-case');
    expect(await mounted.exec('create_tool', { name: 'ping', code: '   ' })).toContain('required');
  });

  it('rejects and removes a module that does not export a tool with the requested name', async () => {
    const mounted = mountController();

    const broken = await mounted.exec('create_tool', { name: 'broken', code: 'export default { nope: true };' });
    expect(broken).toContain('Nothing was saved');
    await expect(stat(join(dir, 'broken.mjs'))).rejects.toThrow();

    const mismatched = await mounted.exec('create_tool', { name: 'foo', code: toolCode('bar') });
    expect(mismatched).toContain('Nothing was saved');
    expect(mounted.registeredNames()).not.toContain('bar');
    await expect(stat(join(dir, 'foo.mjs'))).rejects.toThrow();
  });

  it('rejects a tool name that collides with an existing tool', async () => {
    const mounted = mountController(['search']);

    const created = await mounted.exec('create_tool', { name: 'search', code: toolCode('search') });
    expect(created).toContain('already exists');
    await expect(stat(join(dir, 'search.mjs'))).rejects.toThrow();
  });

  it('allows overwriting a tool it created earlier in the session', async () => {
    const mounted = mountController();

    await mounted.exec('create_tool', { name: 'lookup', code: toolCode('lookup') });
    const updated = await mounted.exec('create_tool', { name: 'lookup', code: toolCode('lookup', 'v2') });
    expect(updated).toContain('It is active now.');
  });

  it('restores the previous file when an update fails validation', async () => {
    const mounted = mountController();

    await mounted.exec('create_tool', { name: 'lookup', code: toolCode('lookup') });
    const failed = await mounted.exec('create_tool', { name: 'lookup', code: 'export default { nope: true };' });
    expect(failed).toContain('Nothing was saved');

    const restored = await loadToolFiles([join(dir, 'lookup.mjs')]);
    expect(restored[0]?.name).toBe('lookup');
  });

  it('drops tools whose files were deleted when the session restarts', async () => {
    await writeFile(join(dir, 'ping.mjs'), toolCode('ping'), 'utf8');
    const mounted = mountController();

    await mounted.sessionStart();
    expect(mounted.active()).toContain('ping');

    await rm(join(dir, 'ping.mjs'));
    await mounted.sessionStart();
    expect(mounted.active()).not.toContain('ping');
  });

  it('allows recreating a tool after its file was deleted mid-session', async () => {
    const mounted = mountController();

    await mounted.exec('create_tool', { name: 'lookup', code: toolCode('lookup') });
    await rm(join(dir, 'lookup.mjs'));
    await mounted.sessionStart();
    expect(mounted.active()).not.toContain('lookup');

    const recreated = await mounted.exec('create_tool', { name: 'lookup', code: toolCode('lookup') });
    expect(recreated).toContain('It is active now.');
    expect(mounted.active()).toContain('lookup');
  });

  it('loads existing tool files on session start', async () => {
    await writeFile(join(dir, 'ping.mjs'), toolCode('ping'), 'utf8');
    const mounted = mountController();

    await mounted.sessionStart();
    expect(mounted.active()).toContain('ping');
    expect(mounted.registeredNames()).toContain('ping');
  });
});

describe('isValidToolName', () => {
  it('accepts kebab-case and rejects malformed names', () => {
    expect(isValidToolName('web-lookup')).toBe(true);
    expect(isValidToolName('web_lookup')).toBe(true);
    expect(isValidToolName('Bad Name')).toBe(false);
    expect(isValidToolName('a--b')).toBe(false);
    expect(isValidToolName('')).toBe(false);
  });
});

describe('discoverToolFiles', () => {
  it('lists only tool modules, sorted, and returns none for a missing directory', async () => {
    await writeFile(join(dir, 'b.mjs'), toolCode('b'), 'utf8');
    await writeFile(join(dir, 'a.js'), toolCode('a'), 'utf8');
    await writeFile(join(dir, 'notes.txt'), 'ignored', 'utf8');

    expect(await discoverToolFiles(dir)).toEqual([join(dir, 'a.js'), join(dir, 'b.mjs')]);
    expect(await discoverToolFiles(join(dir, 'missing'))).toEqual([]);
  });
});

describe('loadToolFiles', () => {
  it('imports valid tool definitions and skips broken or malformed modules', async () => {
    const good = join(dir, 'good.mjs');
    const bad = join(dir, 'bad.mjs');
    const invalid = join(dir, 'invalid.mjs');
    const noParams = join(dir, 'no-params.mjs');
    await writeFile(good, toolCode('good'), 'utf8');
    await writeFile(bad, 'export default {{ this is not valid js', 'utf8');
    await writeFile(invalid, 'export default { name: 123 };', 'utf8');
    await writeFile(noParams, "export default { name: 'x', description: 'd', execute: async () => ({}) };", 'utf8');

    const loaded = await loadToolFiles([good, bad, invalid, noParams]);
    expect(loaded.map((tool) => tool.name)).toEqual(['good']);
  });

  it('reloads tool code after the file changes on disk', async () => {
    const file = join(dir, 'edit.mjs');
    await writeFile(file, toolCode('edit-tool'), 'utf8');
    expect((await loadToolFiles([file]))[0]?.description).toBe('x');

    await writeFile(file, toolCode('edit-tool', 'updated'), 'utf8');
    expect((await loadToolFiles([file]))[0]?.description).toBe('updated');
  });
});
