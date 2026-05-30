import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';
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
  capabilitySource: ToolCapabilitySource
) => {
  const capabilities = toolCapabilitiesFromSource(capabilitySource);
  const toolGuidelines = toolGuidelinesList(capabilities);
  const nextPrompt = replacePromptSection(prompt, 'Available tools:', 'Guidelines:', runtimeToolsList(capabilities));

  if (!nextPrompt) return `${buildStartSystemPrompt(promptsDir, skillsDir, capabilitySource)}\n\n${prompt}`.trim();

  return nextPrompt.replace(filePathGuideline, `${filePathGuideline}${toolGuidelines}`);
};

export const buildStartSystemPrompt = (
  promptsDir: string,
  skillsDir: string,
  capabilitySource?: ToolCapabilitySource
): string => {
  const capabilities = capabilitySource ? toolCapabilitiesFromSource(capabilitySource) : [];
  const toolGuidelines = toolGuidelinesList(capabilities);

  return `You are an expert coding assistant. You help users by reading files, executing commands, editing code, and writing new files.

Available tools:
${runtimeToolsList(capabilities)}

Guidelines:
- Prefer grep/find/ls tools over bash for file exploration (faster, respects .gitignore).
- Be concise in your responses.
${filePathGuideline}${toolGuidelines}

Project and user resources:
- Project rules come from AGENTS.md and CLAUDE.md files in or above the current working directory.
- Existing skills can be loaded from ~/.agents/skills/<skill-name>/SKILL.md or <cwd>/.agents/skills/<skill-name>/SKILL.md.
- Create Start-managed skills in ${skillsDir}/<skill-name>/SKILL.md with YAML frontmatter and instructions.
- Slash prompts belong in ${promptsDir}/<name>.md with YAML frontmatter and prompt text.`;
};

export const createStartPromptExtension = (promptsDir: string, skillsDir: string) => (pi: ExtensionAPI) => {
  pi.on('before_agent_start', async (event) => ({
    systemPrompt: promptWithToolCapabilities(
      event.systemPrompt || buildStartSystemPrompt(promptsDir, skillsDir),
      promptsDir,
      skillsDir,
      {
        getAllTools: () => pi.getAllTools(),
        getActiveToolNames: () => pi.getActiveTools()
      }
    )
  }));
};
