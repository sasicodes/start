import { readdir, readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import {
  type Harness,
  defaultHarness,
  defaultHarnessName,
  harnessToolExtensions,
  maxHarnessTools
} from '@main/harness/default';
import { isValidHarnessName } from '@main/harness/validate';

export const harnessToolsDir = (harnessDir: string, name: string) => join(harnessDir, name, 'tools');

const discoverToolFiles = async (harnessDir: string, name: string): Promise<string[]> => {
  const dir = harnessToolsDir(harnessDir, name);
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);

  return entries
    .filter((entry) => entry.isFile() && harnessToolExtensions.includes(extname(entry.name)))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b))
    .slice(0, maxHarnessTools)
    .map((name) => join(dir, name));
};

const frontmatterPattern = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/u;

const readFrontmatterField = (frontmatter: string, key: string) => {
  const match = frontmatter.match(new RegExp(`^${key}:\\s*(.+)$`, 'mu'));
  return match?.[1]?.trim().replace(/^["']|["']$/gu, '') ?? '';
};

export const parseHarnessFile = (fileName: string, text: string): Harness | null => {
  const name = fileName.replace(/\.md$/u, '');
  if (!isValidHarnessName(name)) return null;

  const match = text.replace(/\r\n/gu, '\n').match(frontmatterPattern);
  const frontmatter = match?.[1] ?? '';
  const body = (match?.[2] ?? text).trim();
  if (!body) return null;

  const description = readFrontmatterField(frontmatter, 'description');
  return { name, body, description: description || `Custom harness "${name}".` };
};

const withToolFiles = async (harnessDir: string, harness: Harness): Promise<Harness> => {
  const toolFiles = await discoverToolFiles(harnessDir, harness.name);
  return toolFiles.length ? { ...harness, toolFiles } : harness;
};

const readHarnessFile = async (harnessDir: string, fileName: string): Promise<Harness | null> => {
  try {
    const harness = parseHarnessFile(fileName, await readFile(join(harnessDir, fileName), 'utf8'));
    return harness ? await withToolFiles(harnessDir, harness) : null;
  } catch {
    return null;
  }
};

export const discoverHarnesses = async (harnessDir: string): Promise<Map<string, Harness>> => {
  const [defaultEntry, entries] = await Promise.all([
    withToolFiles(harnessDir, defaultHarness),
    readdir(harnessDir, { withFileTypes: true }).catch(() => [])
  ]);

  const parsed = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
      .map((entry) => readHarnessFile(harnessDir, entry.name))
  );

  const harnesses = new Map<string, Harness>([[defaultHarnessName, defaultEntry]]);
  for (const harness of parsed) {
    if (harness) harnesses.set(harness.name, harness);
  }

  return harnesses;
};
