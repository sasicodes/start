import { stat } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import type { ToolDefinition } from '@earendil-works/pi-coding-agent';

interface HarnessModule {
  default?: unknown;
}

const isToolDefinition = (value: unknown): value is ToolDefinition => {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as { name?: unknown; description?: unknown; parameters?: unknown; execute?: unknown };
  return (
    typeof candidate.name === 'string' &&
    typeof candidate.description === 'string' &&
    typeof candidate.parameters === 'object' &&
    candidate.parameters !== null &&
    typeof candidate.execute === 'function'
  );
};

const withLabel = (tool: ToolDefinition): ToolDefinition => (tool.label ? tool : { ...tool, label: tool.name });

const readModuleTools = (module: HarnessModule): ToolDefinition[] => {
  const exported = module.default;
  const candidates = Array.isArray(exported) ? exported : [exported];
  return candidates.filter(isToolDefinition).map(withLabel);
};

export const nextActiveTools = (active: readonly string[], previous: readonly string[], next: readonly string[]) => {
  const base = active.filter((name) => !previous.includes(name));
  return [...new Set([...base, ...next])];
};

export const loadHarnessTools = async (toolFiles: readonly string[]): Promise<ToolDefinition[]> => {
  const tools = new Map<string, ToolDefinition>();

  for (const file of toolFiles) {
    try {
      const { mtimeMs } = await stat(file);
      const module: HarnessModule = await import(`${pathToFileURL(file).href}?v=${mtimeMs}`);
      for (const tool of readModuleTools(module)) tools.set(tool.name, tool);
    } catch {}
  }

  return [...tools.values()];
};
