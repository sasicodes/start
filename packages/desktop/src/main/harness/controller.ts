import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { type ExtensionAPI, type ToolDefinition, defineTool } from '@earendil-works/pi-coding-agent';
import { readActiveHarness, writeActiveHarness } from '@main/harness/active';
import { type Harness, defaultHarness, maxHarnessTools } from '@main/harness/default';
import { discoverHarnesses, harnessToolsDir } from '@main/harness/discover';
import { loadHarnessTools, nextActiveTools } from '@main/harness/tools';
import { harnessNameError, isValidHarnessName } from '@main/harness/validate';
import { toolResult } from '@main/providers/tools/result';

interface HarnessControllerOptions {
  harnessDir: string;
  persist?: boolean;
}

const harnessExplainer =
  'A harness is the assistant persona and instructions for the session. It replaces the base behavior with a custom system prompt, plus optional extensions (self-contained tools it can activate).';

const writeHarnessToolFile = async (harnessDir: string, harnessName: string, toolName: string, code: string) => {
  const dir = harnessToolsDir(harnessDir, harnessName);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, `${toolName}.mjs`), `${code.trim()}\n`, 'utf8');
};

const switchParameters = {
  type: 'object',
  required: ['name'],
  additionalProperties: false,
  properties: {
    name: { type: 'string', description: 'Harness name to activate. Use "default" to restore shipped behavior.' }
  }
} as const;

const extensionCodeDescription =
  'Self-contained ES module with no imports. Default-export a plain object with name, description, parameters (JSON schema), and an async execute(id, args) that returns { content: [{ type: "text", text }] }.';

const addExtensionParameters = {
  type: 'object',
  required: ['harness', 'name', 'code'],
  additionalProperties: false,
  properties: {
    harness: {
      type: 'string',
      description: 'Existing harness name to add the extension to, or "default" for the base.'
    },
    name: { type: 'string', description: 'Kebab-case extension name (no file suffix).' },
    code: { type: 'string', description: extensionCodeDescription }
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
    extensions: {
      type: 'array',
      maxItems: maxHarnessTools,
      description: 'Optional self-contained extensions stored under the harness, activated when it is switched on.',
      items: {
        type: 'object',
        required: ['name', 'code'],
        additionalProperties: false,
        properties: {
          name: { type: 'string', description: 'Kebab-case extension name (no file suffix).' },
          code: { type: 'string', description: extensionCodeDescription }
        }
      }
    }
  }
} as const;

export const createHarnessController = ({ harnessDir, persist = true }: HarnessControllerOptions) => {
  let current: Harness = defaultHarness;
  let api: ExtensionAPI | null = null;
  let activeToolNames: string[] = [];
  let reservedNames: Set<string> | null = null;

  const getBody = () => current.body;

  const activateHarness = async (harness: Harness): Promise<number> => {
    current = harness;
    if (!api) return 0;

    if (!reservedNames) reservedNames = new Set(api.getAllTools().map((tool) => tool.name));
    const reserved = reservedNames;
    const loaded = (await loadHarnessTools(harness.toolFiles ?? [])).filter((tool) => !reserved.has(tool.name));
    for (const tool of loaded) api.registerTool(tool);

    const nextNames = loaded.map((tool) => tool.name);
    api.setActiveTools(nextActiveTools(api.getActiveTools(), activeToolNames, nextNames));
    activeToolNames = nextNames;
    return nextNames.length;
  };

  const reactivateIfCurrent = async (name: string): Promise<boolean> => {
    if (current.name !== name) return false;
    const refreshed = (await discoverHarnesses(harnessDir)).get(name);
    if (refreshed) await activateHarness(refreshed);
    return true;
  };

  const restore = async () => {
    const name = readActiveHarness() || defaultHarness.name;
    const harnesses = await discoverHarnesses(harnessDir);
    await activateHarness(harnesses.get(name) ?? defaultHarness);
  };

  const restoreOnSessionStart = async () => {
    try {
      await restore();
    } catch {}
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
        const harness = harnesses.get(requested);
        if (!harness) {
          return toolResult(`No harness named "${requested}". Available: ${[...harnesses.keys()].join(', ')}.`, null);
        }

        const count = await activateHarness(harness);
        if (persist) writeActiveHarness(harness.name);
        const extensionNote = count ? ` Activated ${count} extension(s).` : '';
        return toolResult(`Switched to harness "${harness.name}". ${harness.description}${extensionNote}`, null);
      }
    }),
    defineTool({
      label: 'harness',
      name: 'create_harness',
      parameters: createParameters,
      description: `Create a new harness file the user can switch to later. ${harnessExplainer}`,
      promptSnippet: 'Author a new harness (persona) as a reusable global file.',
      async execute(_toolCallId, { name, body, extensions, description }) {
        const nameError = harnessNameError(name);
        if (nameError) return toolResult(nameError, null);

        const trimmedBody = body.trim();
        if (!trimmedBody) return toolResult('Harness body is required.', null);

        const cleanName = name.trim();
        const invalid = (extensions ?? []).find((extension) => !isValidHarnessName(extension.name));
        if (invalid) return toolResult(`Extension name "${invalid.name}" must be kebab-case.`, null);

        await mkdir(harnessDir, { recursive: true });
        const frontmatter = `---\nname: ${cleanName}\ndescription: ${description.trim()}\n---\n`;
        await writeFile(join(harnessDir, `${cleanName}.md`), `${frontmatter}\n${trimmedBody}\n`, 'utf8');

        for (const extension of extensions ?? []) {
          await writeHarnessToolFile(harnessDir, cleanName, extension.name, extension.code);
        }

        const extensionNote = extensions?.length ? ` with ${extensions.length} extension(s)` : '';
        const activated = await reactivateIfCurrent(cleanName);
        const nextStep = activated ? ' Extensions are active now.' : ' Switch to it with switch_harness.';
        return toolResult(`Created harness "${cleanName}"${extensionNote}.${nextStep}`, null);
      }
    }),
    defineTool({
      label: 'harness',
      name: 'add_extension',
      parameters: addExtensionParameters,
      description: `Add an extension (a self-contained tool) to an existing harness. ${harnessExplainer}`,
      promptSnippet: 'Add a self-contained extension to a harness; it activates when that harness is active.',
      async execute(_toolCallId, { harness: harnessName, name: extensionName, code }) {
        const cleanHarness = harnessName.trim();
        const isDefaultHarness = cleanHarness === defaultHarness.name;
        if (!isDefaultHarness && !isValidHarnessName(cleanHarness)) {
          return toolResult(harnessNameError(cleanHarness), null);
        }
        if (!isValidHarnessName(extensionName)) {
          return toolResult(`Extension name "${extensionName}" must be kebab-case.`, null);
        }

        const trimmedCode = code.trim();
        if (!trimmedCode) return toolResult('Extension code is required.', null);

        const harnesses = await discoverHarnesses(harnessDir);
        if (!harnesses.has(cleanHarness)) {
          return toolResult(`No harness named "${cleanHarness}". Create it first with create_harness.`, null);
        }

        await writeHarnessToolFile(harnessDir, cleanHarness, extensionName, trimmedCode);

        const activated = await reactivateIfCurrent(cleanHarness);
        const nextStep = activated ? 'and activated it' : 'switch to it to activate';
        return toolResult(`Added extension "${extensionName}" to "${cleanHarness}" ${nextStep}.`, null);
      }
    })
  ];

  const extension = (pi: ExtensionAPI) => {
    api = pi;
    for (const tool of tools) pi.registerTool(tool);
    pi.on('session_start', restoreOnSessionStart);
  };

  return { getBody, extension };
};

export type HarnessController = ReturnType<typeof createHarnessController>;
