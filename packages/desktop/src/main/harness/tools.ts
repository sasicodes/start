import { pathToFileURL } from 'node:url';
import type { ToolDefinition } from '@earendil-works/pi-coding-agent';

interface HarnessModule {
  default?: unknown;
}

const isToolDefinition = (value: unknown): value is ToolDefinition =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as { name?: unknown }).name === 'string' &&
  typeof (value as { execute?: unknown }).execute === 'function';

const readModuleTools = (module: HarnessModule): ToolDefinition[] => {
  const exported = module.default;
  const candidates = Array.isArray(exported) ? exported : [exported];
  return candidates.filter(isToolDefinition);
};

export const nextActiveTools = (active: readonly string[], previous: readonly string[], next: readonly string[]) => {
  const base = active.filter((name) => !previous.includes(name));
  return [...new Set([...base, ...next])];
};

export const loadHarnessTools = async (toolFiles: readonly string[]): Promise<ToolDefinition[]> => {
  const tools = new Map<string, ToolDefinition>();

  for (const file of toolFiles) {
    try {
      const module: HarnessModule = await import(pathToFileURL(file).href);
      for (const tool of readModuleTools(module)) tools.set(tool.name, tool);
    } catch {}
  }

  return [...tools.values()];
};
