import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { type ExtensionAPI, type ToolDefinition, defineTool } from '@earendil-works/pi-coding-agent';
import { type Harness, defaultHarness, maxHarnessTools } from '@main/harness/default';
import { discoverHarnesses, harnessToolsDir } from '@main/harness/discover';
import { loadHarnessTools, nextActiveTools } from '@main/harness/tools';
import { harnessNameError, isValidHarnessName } from '@main/harness/validate';
import { toolResult } from '@main/providers/tools/result';

interface HarnessControllerOptions {
  harnessDir: string;
}

const harnessExplainer =
  'A harness is the assistant persona and instructions for the session. It replaces the base behavior with a custom system prompt, plus optional tools stored under <name>/tools.';

const switchParameters = {
  type: 'object',
  required: ['name'],
  additionalProperties: false,
  properties: {
    name: { type: 'string', description: 'Harness name to activate. Use "default" to restore shipped behavior.' }
  }
} as const;

const createParameters = {
  type: 'object',
  required: ['name', 'description', 'body'],
  additionalProperties: false,
  properties: {
    name: { type: 'string', description: 'Kebab-case harness name. Cannot be "default".' },
    description: { type: 'string', description: 'One line describing when to use this harness.' },
    body: { type: 'string', description: 'The persona and instructions that replace the base system prompt.' },
    tools: {
      type: 'array',
      maxItems: maxHarnessTools,
      description: 'Optional self-contained tool files stored under the harness, activated when it is switched on.',
      items: {
        type: 'object',
        required: ['name', 'code'],
        additionalProperties: false,
        properties: {
          name: { type: 'string', description: 'Kebab-case tool file name without extension.' },
          code: {
            type: 'string',
            description:
              'Self-contained ES module with no imports. Default-export a plain object with name, description, parameters (JSON schema), and an async execute(id, args) that returns { content: [{ type: "text", text }] }.'
          }
        }
      }
    }
  }
} as const;

export const createHarnessController = ({ harnessDir }: HarnessControllerOptions) => {
  let current: Harness = defaultHarness;
  let api: ExtensionAPI | null = null;
  let activeToolNames: string[] = [];

  const getBody = () => current.body;

  const activateHarness = async (harness: Harness) => {
    current = harness;
    if (!api) return;

    const loaded = await loadHarnessTools(harness.toolFiles ?? []);
    const registered = new Set(api.getAllTools().map((tool) => tool.name));
    for (const tool of loaded) {
      if (!registered.has(tool.name)) api.registerTool(tool);
    }

    const nextNames = loaded.map((tool) => tool.name);
    api.setActiveTools(nextActiveTools(api.getActiveTools(), activeToolNames, nextNames));
    activeToolNames = nextNames;
  };

  const tools: ToolDefinition[] = [
    defineTool({
      label: 'harness',
      name: 'switch_harness',
      parameters: switchParameters,
      description: `Switch the active harness. ${harnessExplainer} "default" always restores shipped behavior.`,
      promptSnippet: 'Switch persona for the session; use name "default" to restore shipped behavior.',
      async execute(_toolCallId, { name }) {
        const requested = name.trim();
        const harnesses = await discoverHarnesses(harnessDir);
        const harness = requested === defaultHarness.name ? defaultHarness : harnesses.get(requested);
        if (!harness) {
          return toolResult(`No harness named "${requested}". Available: ${[...harnesses.keys()].join(', ')}.`, null);
        }

        await activateHarness(harness);
        const toolNote = harness.toolFiles?.length ? ` Activated ${harness.toolFiles.length} harness tool(s).` : '';
        return toolResult(`Switched to harness "${harness.name}". ${harness.description}${toolNote}`, null);
      }
    }),
    defineTool({
      label: 'harness',
      name: 'create_harness',
      parameters: createParameters,
      description: `Create a new harness file the user can switch to later. ${harnessExplainer}`,
      promptSnippet: 'Author a new harness (persona) as a reusable global file.',
      async execute(_toolCallId, { name, body, tools: toolFiles, description }) {
        const nameError = harnessNameError(name);
        if (nameError) return toolResult(nameError, null);

        const trimmedBody = body.trim();
        if (!trimmedBody) return toolResult('Harness body is required.', null);

        const cleanName = name.trim();
        const invalidTool = (toolFiles ?? []).find((tool) => !isValidHarnessName(tool.name));
        if (invalidTool) return toolResult(`Tool name "${invalidTool.name}" must be kebab-case.`, null);

        await mkdir(harnessDir, { recursive: true });
        const frontmatter = `---\nname: ${cleanName}\ndescription: ${description.trim()}\n---\n`;
        await writeFile(join(harnessDir, `${cleanName}.md`), `${frontmatter}\n${trimmedBody}\n`, 'utf8');

        if (toolFiles?.length) {
          const dir = harnessToolsDir(harnessDir, cleanName);
          await mkdir(dir, { recursive: true });
          for (const tool of toolFiles) {
            await writeFile(join(dir, `${tool.name}.mjs`), `${tool.code.trim()}\n`, 'utf8');
          }
        }

        const toolNote = toolFiles?.length ? ` with ${toolFiles.length} tool(s)` : '';
        return toolResult(`Created harness "${cleanName}"${toolNote}. Switch to it with switch_harness.`, null);
      }
    })
  ];

  const extension = (pi: ExtensionAPI) => {
    api = pi;
    for (const tool of tools) pi.registerTool(tool);
  };

  return { getBody, extension };
};

export type HarnessController = ReturnType<typeof createHarnessController>;
