import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { type ExtensionAPI, type ToolDefinition, defineTool } from '@earendil-works/pi-coding-agent';
import { discoverToolFiles, isValidToolName, loadToolFiles } from '@main/tools/load';
import { toolResult } from '@main/providers/tools/result';

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

  const registerToolFiles = async (): Promise<string[]> => {
    if (!api) return [];

    if (!reservedNames) reservedNames = new Set(api.getAllTools().map((tool) => tool.name));
    const reserved = reservedNames;
    const loaded = (await loadToolFiles(await discoverToolFiles(toolsDir))).filter((tool) => !reserved.has(tool.name));
    for (const tool of loaded) api.registerTool(tool);

    const names = loaded.map((tool) => tool.name);
    api.setActiveTools([...new Set([...api.getActiveTools(), ...names])]);
    return names;
  };

  const registerOnSessionStart = async () => {
    try {
      await registerToolFiles();
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

      await mkdir(toolsDir, { recursive: true });
      await writeFile(join(toolsDir, `${cleanName}.mjs`), `${trimmedCode}\n`, 'utf8');

      const registered = await registerToolFiles();
      const activated = registered.includes(cleanName);
      const note = activated
        ? 'It is active now.'
        : 'It could not be activated; check that the module default-exports a valid tool with that name.';
      return toolResult(`Created tool "${cleanName}". ${note}`, null);
    }
  });

  const extension = (pi: ExtensionAPI) => {
    api = pi;
    pi.registerTool(createTool);
    pi.on('session_start', registerOnSessionStart);
  };

  return { extension };
};
