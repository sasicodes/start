import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { type Harness, defaultHarness, defaultHarnessName } from '@main/harness/default';
import { isValidHarnessName } from '@main/harness/validate';

const frontmatterPattern = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/u;

const readFrontmatterField = (frontmatter: string, key: string) => {
  const match = frontmatter.match(new RegExp(`^${key}:\\s*(.+)$`, 'mu'));
  return match?.[1]?.trim().replace(/^["']|["']$/gu, '') ?? '';
};

export const parseHarnessFile = (fileName: string, text: string): Harness | null => {
  const name = fileName.replace(/\.md$/u, '');
  if (!isValidHarnessName(name)) return null;

  const match = text.match(frontmatterPattern);
  const frontmatter = match?.[1] ?? '';
  const body = (match?.[2] ?? text).trim();
  if (!body) return null;

  const description = readFrontmatterField(frontmatter, 'description');
  return { name, body, description: description || `Custom harness "${name}".` };
};

export const discoverHarnesses = async (harnessDir: string): Promise<Map<string, Harness>> => {
  const harnesses = new Map<string, Harness>([[defaultHarnessName, defaultHarness]]);

  try {
    const entries = await readdir(harnessDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.md')) continue;

      const text = await readFile(join(harnessDir, entry.name), 'utf8');
      const harness = parseHarnessFile(entry.name, text);
      if (harness) harnesses.set(harness.name, harness);
    }
  } catch {
    return harnesses;
  }

  return harnesses;
};
