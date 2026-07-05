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
  it('imports valid tool definitions and skips broken modules', async () => {
    const good = join(dir, 'good.mjs');
    const bad = join(dir, 'bad.mjs');
    const invalid = join(dir, 'invalid.mjs');
    await writeFile(good, toolModule('good'), 'utf8');
    await writeFile(bad, 'export default {{ this is not valid js', 'utf8');
    await writeFile(invalid, 'export default { name: 123 };', 'utf8');

    const loaded = await loadHarnessTools([good, bad, invalid]);
    expect(loaded.map((tool) => tool.name)).toEqual(['good']);
  });
});
