import { readdir, stat } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { ToolDefinition } from '@earendil-works/pi-coding-agent';
import * as v from 'valibot';

export const maxAgentTools = 16;
export const agentToolExtensions = ['.mjs', '.js'];

const toolSchema = v.looseObject({
  name: v.pipe(v.string(), v.minLength(1)),
  description: v.string(),
  parameters: v.looseObject({}),
  execute: v.function()
});

const isToolDefinition = (value: unknown): value is ToolDefinition => v.is(toolSchema, value);

const toolNamePattern = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/u;

export const isValidToolName = (name: string) => toolNamePattern.test(name);

export const discoverToolFiles = async (toolsDir: string): Promise<string[]> => {
  const entries = await readdir(toolsDir, { withFileTypes: true }).catch(() => []);

  return entries
    .filter((entry) => entry.isFile() && agentToolExtensions.includes(extname(entry.name)))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b))
    .slice(0, maxAgentTools)
    .map((name) => join(toolsDir, name));
};

export const loadToolFiles = async (toolFiles: readonly string[]): Promise<ToolDefinition[]> => {
  const tools = new Map<string, ToolDefinition>();

  for (const file of toolFiles) {
    try {
      const { mtimeMs } = await stat(file);
      const { default: exported }: { default?: unknown } = await import(`${pathToFileURL(file).href}?v=${mtimeMs}`);
      for (const candidate of Array.isArray(exported) ? exported : [exported]) {
        if (isToolDefinition(candidate)) {
          tools.set(candidate.name, candidate.label ? candidate : { ...candidate, label: candidate.name });
        }
      }
    } catch {}
  }

  return [...tools.values()];
};
