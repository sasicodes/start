import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { type ExtensionAPI, type ToolDefinition, defineTool } from '@earendil-works/pi-coding-agent';
import { type Harness, defaultHarness } from '@main/harness/default';
import { discoverHarnesses } from '@main/harness/discover';
import { harnessNameError } from '@main/harness/validate';
import { toolResult } from '@main/providers/tools/result';

interface HarnessControllerOptions {
  harnessDir: string;
}

const harnessExplainer =
  'A harness is the assistant persona and instructions for the session. It replaces the base behavior with a custom system prompt.';

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
    body: { type: 'string', description: 'The persona and instructions that replace the base system prompt.' }
  }
} as const;

export const createHarnessController = ({ harnessDir }: HarnessControllerOptions) => {
  let current: Harness = defaultHarness;

  const getBody = () => current.body;

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

        current = harness;
        return toolResult(`Switched to harness "${harness.name}". ${harness.description}`, null);
      }
    }),
    defineTool({
      label: 'harness',
      name: 'create_harness',
      parameters: createParameters,
      description: `Create a new harness file the user can switch to later. ${harnessExplainer}`,
      promptSnippet: 'Author a new harness (persona) as a reusable global file.',
      async execute(_toolCallId, { name, body, description }) {
        const nameError = harnessNameError(name);
        if (nameError) return toolResult(nameError, null);

        const trimmedBody = body.trim();
        if (!trimmedBody) return toolResult('Harness body is required.', null);

        const cleanName = name.trim();
        await mkdir(harnessDir, { recursive: true });
        const frontmatter = `---\nname: ${cleanName}\ndescription: ${description.trim()}\n---\n`;
        await writeFile(join(harnessDir, `${cleanName}.md`), `${frontmatter}\n${trimmedBody}\n`, 'utf8');

        return toolResult(`Created harness "${cleanName}". Switch to it with switch_harness.`, null);
      }
    })
  ];

  const extension = (pi: ExtensionAPI) => {
    for (const tool of tools) pi.registerTool(tool);
  };

  return { getBody, extension };
};

export type HarnessController = ReturnType<typeof createHarnessController>;
