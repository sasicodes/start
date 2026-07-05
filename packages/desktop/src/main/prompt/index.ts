import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';
import { defaultHarness } from '@main/harness/default';
import * as v from 'valibot';

interface ToolCapability {
  name: string;
  description: string;
  promptGuidelines: string[];
}

interface ToolCapabilitySource {
  getAllTools: () => readonly unknown[];
  getActiveToolNames: () => readonly string[];
}

const trimmed = v.pipe(v.string(), v.trim());
const fallbackToolDescription = 'Available runtime tool.';
const filePathGuideline = '- Show file paths clearly when working with files.';

const promptGuidelinesSchema = v.pipe(
  v.array(trimmed),
  v.transform((guidelines) => guidelines.filter((guideline) => guideline.length > 0))
);

const runtimeToolSchema = v.object({
  description: v.optional(trimmed, ''),
  name: v.pipe(trimmed, v.minLength(1)),
  promptSnippet: v.optional(trimmed, ''),
  promptGuidelines: v.optional(promptGuidelinesSchema, [])
});

const runtimeToolCapabilitySchema = v.union([
  runtimeToolSchema,
  v.object({
    definition: runtimeToolSchema
  })
]);

const singleLineText = (value: string) => value.trim().split(/\s+/u).join(' ');

const readToolCapability = (value: unknown): ToolCapability | null => {
  const result = v.safeParse(runtimeToolCapabilitySchema, value);
  if (!result.success) return null;

  const tool = 'definition' in result.output ? result.output.definition : result.output;
  const description = singleLineText(tool.promptSnippet || tool.description || fallbackToolDescription);

  return {
    description,
    name: tool.name,
    promptGuidelines: tool.promptGuidelines
  };
};

const uniqueStrings = (values: readonly string[]) => [...new Set(values.map((value) => value.trim()).filter(Boolean))];

const toolCapabilitiesFromSource = (source: ToolCapabilitySource): ToolCapability[] => {
  const toolsByName = new Map<string, ToolCapability>();

  for (const value of source.getAllTools()) {
    const tool = readToolCapability(value);
    if (tool) toolsByName.set(tool.name, tool);
  }

  return uniqueStrings(source.getActiveToolNames()).map(
    (name) =>
      toolsByName.get(name) ?? {
        name,
        promptGuidelines: [],
        description: fallbackToolDescription
      }
  );
};

const runtimeToolsList = (capabilities: readonly ToolCapability[]) => {
  if (capabilities.length === 0) return '- Runtime tools are loaded from the active session.';

  return capabilities.map(({ name, description }) => `- ${name}: ${description}`).join('\n');
};

const toolGuidelinesList = (capabilities: readonly ToolCapability[]) => {
  const guidelines = uniqueStrings(capabilities.flatMap(({ promptGuidelines }) => promptGuidelines));
  return guidelines.length > 0 ? `\n${guidelines.map((guideline) => `- ${guideline}`).join('\n')}` : '';
};

const replacePromptSection = (prompt: string, heading: string, nextHeading: string, body: string) => {
  const start = prompt.indexOf(heading);
  if (start < 0) return '';

  const contentStart = start + heading.length;
  const contentEnd = prompt.indexOf(nextHeading, contentStart);
  if (contentEnd < 0) return '';

  return `${prompt.slice(0, contentStart)}\n${body}\n\n${prompt.slice(contentEnd)}`;
};

const promptWithToolCapabilities = (
  prompt: string,
  promptsDir: string,
  skillsDir: string,
  capabilitySource: ToolCapabilitySource,
  harnessBody: string
) => {
  const capabilities = toolCapabilitiesFromSource(capabilitySource);
  const toolGuidelines = toolGuidelinesList(capabilities);
  const nextPrompt = replacePromptSection(prompt, 'Available tools:', 'Guidelines:', runtimeToolsList(capabilities));

  if (!nextPrompt) {
    return `${buildStartSystemPrompt(promptsDir, skillsDir, capabilitySource, harnessBody)}\n\n${prompt}`.trim();
  }

  return nextPrompt.replace(filePathGuideline, `${filePathGuideline}${toolGuidelines}`);
};

const runtimeContextMarker = '\n\nUser timezone:';

export const runtimeContextBlock = (now = new Date()): string => {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const localTime = new Intl.DateTimeFormat(undefined, { dateStyle: 'full', timeStyle: 'long', timeZone }).format(now);
  return `User timezone: ${timeZone}\nUser local time: ${localTime}`;
};

export const replaceHarnessIntro = (prompt: string, intro: string): string => {
  const marker = 'Available tools:';
  const markerIndex = prompt.indexOf(marker);
  if (markerIndex < 0) return prompt;
  return `${intro}\n\n${prompt.slice(markerIndex)}`;
};

export const buildStartSystemPrompt = (
  promptsDir: string,
  skillsDir: string,
  capabilitySource?: ToolCapabilitySource,
  harnessBody: string = defaultHarness.body
): string => {
  const capabilities = capabilitySource ? toolCapabilitiesFromSource(capabilitySource) : [];
  const toolGuidelines = toolGuidelinesList(capabilities);

  return `${harnessBody}

Available tools:
${runtimeToolsList(capabilities)}

Guidelines:
- Use the listed runtime tools for repository file discovery and code search before broad shell commands.
- Be concise in your responses.
${filePathGuideline}${toolGuidelines}

Project and user resources:
- Project rules come from AGENTS.md files in or above the current working directory.
- Existing skills can be loaded from ~/.agents/skills/<skill-name>/SKILL.md or <cwd>/.agents/skills/<skill-name>/SKILL.md.
- Create Start-managed skills in ${skillsDir}/<skill-name>/SKILL.md with YAML frontmatter and instructions.
- Slash prompts belong in ${promptsDir}/<name>.md with YAML frontmatter and prompt text.`;
};

export const createStartPromptExtension =
  (promptsDir: string, skillsDir: string, harness?: { getBody: () => string }) => (pi: ExtensionAPI) => {
    pi.on('before_agent_start', async (event) => {
      const harnessBody = harness?.getBody() ?? defaultHarness.body;
      const base = event.systemPrompt || buildStartSystemPrompt(promptsDir, skillsDir);
      const withHarness = harnessBody === defaultHarness.body ? base : replaceHarnessIntro(base, harnessBody);
      const withCapabilities = promptWithToolCapabilities(
        withHarness,
        promptsDir,
        skillsDir,
        { getAllTools: () => pi.getAllTools(), getActiveToolNames: () => pi.getActiveTools() },
        harnessBody
      );
      const markerIndex = withCapabilities.indexOf(runtimeContextMarker);
      const withoutStaleContext = (
        markerIndex < 0 ? withCapabilities : withCapabilities.slice(0, markerIndex)
      ).trimEnd();

      return { systemPrompt: `${withoutStaleContext}\n\n${runtimeContextBlock()}` };
    });
  };
