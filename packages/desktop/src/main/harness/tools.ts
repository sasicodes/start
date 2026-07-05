import { stat } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import type { ToolDefinition } from '@earendil-works/pi-coding-agent';
import * as v from 'valibot';

const toolSchema = v.looseObject({
  name: v.pipe(v.string(), v.minLength(1)),
  description: v.string(),
  parameters: v.looseObject({}),
  execute: v.function()
});

const isToolDefinition = (value: unknown): value is ToolDefinition => v.is(toolSchema, value);

export const nextActiveTools = (active: readonly string[], previous: readonly string[], next: readonly string[]) => {
  const base = active.filter((name) => !previous.includes(name));
  return [...new Set([...base, ...next])];
};

export const loadHarnessTools = async (toolFiles: readonly string[]): Promise<ToolDefinition[]> => {
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
