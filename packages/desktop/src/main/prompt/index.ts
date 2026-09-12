import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';
import { globalMcpConfigPath } from '@main/mcp/config';
import * as v from 'valibot';

interface ToolCapability {
  name: string;
  snippet: string;
  promptGuidelines: string[];
}

interface ToolCapabilitySource {
  getAllTools: () => readonly unknown[];
  getActiveToolNames: () => readonly string[];
}

const trimmed = v.pipe(v.string(), v.trim());
const filePathGuideline = '- Show file paths clearly when working with files.';

const promptGuidelinesSchema = v.pipe(
  v.array(trimmed),
  v.transform((guidelines) => guidelines.filter((guideline) => guideline.length > 0))
);

const runtimeToolSchema = v.object({
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

  return {
    name: tool.name,
    snippet: singleLineText(tool.promptSnippet),
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
        snippet: '',
        promptGuidelines: []
      }
  );
};

const runtimeToolsList = (capabilities: readonly ToolCapability[]) => {
  if (capabilities.length === 0) return '- Runtime tools are loaded from the active session.';

  const tools = capabilities.map(({ name, snippet }) => (snippet ? `- ${name}: ${snippet}` : `- ${name}`)).join('\n');
  return `Use each tool's definition for its full purpose, parameters, and usage restrictions.\n${tools}`;
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

  if (!nextPrompt) {
    return `${buildStartSystemPrompt(promptsDir, skillsDir, capabilitySource)}\n\n${prompt}`.trim();
  }

  return nextPrompt.replace(filePathGuideline, `${filePathGuideline}${toolGuidelines}`);
};

const nowOpen = '<now>';
const nowClose = '</now>';

export const runtimeContextBlock = (now = new Date()): string => `${nowOpen}${now.toString()}${nowClose}`;

const trailingNowBlock = /<now>([^<]*)<\/now>\s*$/u;
const runtimeTimestamp = /^[A-Za-z]{3} [A-Za-z]{3} \d{2} \d{4} \d{2}:\d{2}:\d{2} GMT[+-]\d{4}/u;

const stripRuntimeContext = (prompt: string): string => {
  const match = trailingNowBlock.exec(prompt);
  if (!match || !runtimeTimestamp.test(match[1] ?? '')) return prompt;
  return prompt.slice(0, match.index).trimEnd();
};

export const buildStartSystemPrompt = (
  promptsDir: string,
  skillsDir: string,
  capabilitySource?: ToolCapabilitySource
): string => {
  const capabilities = capabilitySource ? toolCapabilitiesFromSource(capabilitySource) : [];
  const toolGuidelines = toolGuidelinesList(capabilities);

  return `You are an expert coding assistant. Read files, run commands, and write or edit code.

Available tools:
${runtimeToolsList(capabilities)}

Guidelines:
- Use listed runtime discovery/search tools before broad shell commands.
- Be precise and concise. Keep replies under 1k characters by default; expand when asked or when a subagent handoff needs supporting evidence.
${filePathGuideline}${toolGuidelines}

Resources:
- Project rules: AGENTS.md files in or above cwd.
- Skills: <skill-name>/SKILL.md with YAML frontmatter and instructions; load from ~/.agents/skills and <cwd>/.agents/skills; create Start-managed skills in ${skillsDir}.
- Slash prompts: ${promptsDir}/<name>.md with YAML frontmatter and prompt text.
- MCP: "mcpServers" entries in <cwd>/.mcp.json or ${globalMcpConfigPath()}. Project servers require a remote "url"; "command" servers are global-only. Never store secrets in either file; use \${VAR} environment references.`;
};

export const createStartPromptExtension = (promptsDir: string, skillsDir: string) => (pi: ExtensionAPI) => {
  pi.on('before_agent_start', async (event) => {
    const base = event.systemPrompt || buildStartSystemPrompt(promptsDir, skillsDir);
    const withCapabilities = promptWithToolCapabilities(base, promptsDir, skillsDir, {
      getAllTools: () => pi.getAllTools(),
      getActiveToolNames: () => pi.getActiveTools()
    });
    const withoutStaleContext = stripRuntimeContext(withCapabilities);

    return { systemPrompt: `${withoutStaleContext}\n\n${runtimeContextBlock()}` };
  });
};
