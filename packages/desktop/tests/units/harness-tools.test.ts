import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { discoverHarnesses, harnessToolsDir } from '@main/harness/discover';
import { loadHarnessTools, nextActiveTools } from '@main/harness/tools';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

let dir = '';

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'harness-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const toolModule = (name: string) =>
  `export default { name: '${name}', label: '${name}', description: 'x', parameters: { type: 'object', properties: {}, required: [] }, execute: async () => ({ content: [] }) };`;

describe('harness tool discovery', () => {
  it('attaches tool files found under <name>/tools', async () => {
    await writeFile(join(dir, 'research.md'), '---\nname: research\ndescription: d\n---\nYou research.', 'utf8');
    const toolsDir = harnessToolsDir(dir, 'research');
    await mkdir(toolsDir, { recursive: true });
    await writeFile(join(toolsDir, 'lookup.mjs'), toolModule('lookup'), 'utf8');
    await writeFile(join(toolsDir, 'notes.txt'), 'ignored', 'utf8');

    const harness = (await discoverHarnesses(dir)).get('research');
    expect(harness?.toolFiles).toEqual([join(toolsDir, 'lookup.mjs')]);
  });

  it('omits toolFiles when the harness has no tools', async () => {
    await writeFile(join(dir, 'plain.md'), '---\nname: plain\ndescription: d\n---\nYou help.', 'utf8');
    expect((await discoverHarnesses(dir)).get('plain')?.toolFiles).toBeUndefined();
  });

  it('parses CRLF harness files', async () => {
    await writeFile(
      join(dir, 'win.md'),
      '---\r\nname: win\r\ndescription: Windows.\r\n---\r\nYou help on Windows.',
      'utf8'
    );
    const harness = (await discoverHarnesses(dir)).get('win');
    expect(harness?.description).toBe('Windows.');
    expect(harness?.body).toBe('You help on Windows.');
  });

  it('attaches tool files to the default harness too', async () => {
    const toolsDir = harnessToolsDir(dir, 'default');
    await mkdir(toolsDir, { recursive: true });
    await writeFile(join(toolsDir, 'ping.mjs'), toolModule('ping'), 'utf8');

    expect((await discoverHarnesses(dir)).get('default')?.toolFiles).toEqual([join(toolsDir, 'ping.mjs')]);
  });
});

describe('nextActiveTools', () => {
  it('keeps built-ins, drops the previous harness tools, and adds the next ones', () => {
    expect(nextActiveTools(['read', 'edit', 'old_tool'], ['old_tool'], ['new_tool'])).toEqual([
      'read',
      'edit',
      'new_tool'
    ]);
  });

  it('deduplicates and clears harness tools when switching to a toolless harness', () => {
    expect(nextActiveTools(['read', 'a', 'a'], ['a'], [])).toEqual(['read']);
  });
});

describe('loadHarnessTools', () => {
  it('imports valid tool definitions and skips broken or malformed modules', async () => {
    const good = join(dir, 'good.mjs');
    const bad = join(dir, 'bad.mjs');
    const invalid = join(dir, 'invalid.mjs');
    const noParams = join(dir, 'no-params.mjs');
    await writeFile(good, toolModule('good'), 'utf8');
    await writeFile(bad, 'export default {{ this is not valid js', 'utf8');
    await writeFile(invalid, 'export default { name: 123 };', 'utf8');
    await writeFile(noParams, "export default { name: 'x', description: 'd', execute: async () => ({}) };", 'utf8');

    const loaded = await loadHarnessTools([good, bad, invalid, noParams]);
    expect(loaded.map((tool) => tool.name)).toEqual(['good']);
  });

  it('reloads tool code after the file changes on disk', async () => {
    const file = join(dir, 'edit.mjs');
    await writeFile(file, toolModule('edit-tool'), 'utf8');
    expect((await loadHarnessTools([file]))[0]?.description).toBe('x');

    await writeFile(
      file,
      "export default { name: 'edit-tool', label: 'edit-tool', description: 'updated', parameters: { type: 'object', properties: {}, required: [] }, execute: async () => ({ content: [] }) };",
      'utf8'
    );
    expect((await loadHarnessTools([file]))[0]?.description).toBe('updated');
  });
});
