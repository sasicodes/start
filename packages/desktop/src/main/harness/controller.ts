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

const toolCodeDescription =
  'Self-contained ES module with no imports. Default-export a plain object with name, description, parameters (JSON schema), and an async execute(id, args) that returns { content: [{ type: "text", text }] }.';

const addToolParameters = {
  type: 'object',
  required: ['harness', 'name', 'code'],
  additionalProperties: false,
  properties: {
    harness: { type: 'string', description: 'Existing harness name to add the tool to, or "default" for the base.' },
    name: { type: 'string', description: 'Kebab-case tool file name without extension.' },
    code: { type: 'string', description: toolCodeDescription }
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
          code: { type: 'string', description: toolCodeDescription }
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

  const reactivateIfCurrent = async (name: string): Promise<boolean> => {
    if (current.name !== name) return false;
    const refreshed = (await discoverHarnesses(harnessDir)).get(name);
    if (refreshed) await activateHarness(refreshed);
    return true;
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
        const activated = await reactivateIfCurrent(cleanName);
        const nextStep = activated ? ' Tools are active now.' : ' Switch to it with switch_harness.';
        return toolResult(`Created harness "${cleanName}"${toolNote}.${nextStep}`, null);
      }
    }),
    defineTool({
      label: 'harness',
      name: 'add_harness_tool',
      parameters: addToolParameters,
      description: `Add a tool to an existing harness. ${harnessExplainer}`,
      promptSnippet: 'Add a self-contained tool to a harness; it activates when that harness is active.',
      async execute(_toolCallId, { harness: harnessName, name: toolName, code }) {
        const cleanHarness = harnessName.trim();
        if (!isValidHarnessName(cleanHarness)) {
          return toolResult(harnessNameError(cleanHarness) || `Invalid harness name "${cleanHarness}".`, null);
        }
        if (!isValidHarnessName(toolName)) return toolResult(`Tool name "${toolName}" must be kebab-case.`, null);

        const trimmedCode = code.trim();
        if (!trimmedCode) return toolResult('Tool code is required.', null);

        const harnesses = await discoverHarnesses(harnessDir);
        if (!harnesses.has(cleanHarness)) {
          return toolResult(`No harness named "${cleanHarness}". Create it first with create_harness.`, null);
        }

        const dir = harnessToolsDir(harnessDir, cleanHarness);
        await mkdir(dir, { recursive: true });
        await writeFile(join(dir, `${toolName}.mjs`), `${trimmedCode}\n`, 'utf8');

        const activated = await reactivateIfCurrent(cleanHarness);
        const nextStep = activated ? 'and activated it' : 'switch to it to activate';
        return toolResult(`Added tool "${toolName}" to "${cleanHarness}" ${nextStep}.`, null);
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
