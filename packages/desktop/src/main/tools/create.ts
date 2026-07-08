import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { type ExtensionAPI, type ToolDefinition, defineTool } from '@earendil-works/pi-coding-agent';
import { discoverToolFiles, loadToolFiles } from '@main/tools/load';
import { toolResult } from '@main/providers/tools/result';

const toolNamePattern = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/u;

export const isValidToolName = (name: string) => toolNamePattern.test(name);

const codeDescription =
  'Self-contained ES module with no imports. Default-export a plain object with name, description, parameters (JSON schema), and an async execute(id, args) that returns { content: [{ type: "text", text }] }.';

const createParameters = {
  type: 'object',
  required: ['name', 'code'],
  additionalProperties: false,
  properties: {
    name: { type: 'string', description: 'Kebab-case tool name (no file suffix).' },
    code: { type: 'string', description: codeDescription }
  }
} as const;

export const createToolController = (toolsDir: string) => {
  let api: ExtensionAPI | null = null;
  let reservedNames: Set<string> | null = null;
  let loadedNames: string[] = [];

  const reserved = (): Set<string> => {
    if (!reservedNames && api) reservedNames = new Set(api.getAllTools().map((tool) => tool.name));
    return reservedNames ?? new Set();
  };

  const activateTools = (loaded: readonly ToolDefinition[], previous: readonly string[]): string[] => {
    if (!api) return [];

    const reservedSet = reserved();
    const usable = loaded.filter((tool) => !reservedSet.has(tool.name));
    for (const tool of usable) api.registerTool(tool);

    const names = usable.map((tool) => tool.name);
    const base = api.getActiveTools().filter((name) => !previous.includes(name));
    api.setActiveTools([...new Set([...base, ...names])]);
    loadedNames = [...new Set([...loadedNames.filter((name) => !previous.includes(name)), ...names])];
    return names;
  };

  const registerOnSessionStart = async () => {
    try {
      activateTools(await loadToolFiles(await discoverToolFiles(toolsDir)), loadedNames);
    } catch {}
  };

  const createTool: ToolDefinition = defineTool({
    label: 'tool',
    name: 'create_tool',
    parameters: createParameters,
    description: `Create a persistent global tool the agent can use in every session. Writes a tool file to ${toolsDir} and activates it immediately. Code: ${codeDescription}`,
    promptSnippet: 'Author a persistent global tool; it is saved and activated immediately.',
    async execute(_toolCallId, { name, code }) {
      const cleanName = name.trim();
      if (!isValidToolName(cleanName)) {
        return toolResult(`Tool name "${cleanName}" must be kebab-case (lowercase letters, digits, hyphens).`, null);
      }

      const trimmedCode = code.trim();
      if (!trimmedCode) return toolResult('Tool code is required.', null);

      if (reserved().has(cleanName)) {
        return toolResult(`A tool named "${cleanName}" already exists. Pick another name.`, null);
      }

      const filePath = join(toolsDir, `${cleanName}.mjs`);
      await mkdir(toolsDir, { recursive: true });
      const previousCode = await readFile(filePath, 'utf8').catch(() => '');
      await writeFile(filePath, `${trimmedCode}\n`, 'utf8');

      const tool = (await loadToolFiles([filePath])).find((loaded) => loaded.name === cleanName);
      if (!tool) {
        if (previousCode) await writeFile(filePath, previousCode, 'utf8');
        else await rm(filePath, { force: true });
        return toolResult(
          `Tool module must default-export a valid tool named "${cleanName}". Nothing was saved.`,
          null
        );
      }

      activateTools([tool], []);
      return toolResult(`Created tool "${cleanName}". It is active now.`, null);
    }
  });

  const extension = (pi: ExtensionAPI) => {
    api = pi;
    pi.registerTool(createTool);
    pi.on('session_start', registerOnSessionStart);
  };

  return { extension };
};
