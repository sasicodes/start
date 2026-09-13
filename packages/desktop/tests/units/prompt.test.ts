import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';
import { globalMcpConfigPath } from '@main/mcp/config';
import { buildStartSystemPrompt, createStartPromptExtension } from '@main/prompt/index';
import { describe, expect, it } from 'vitest';

interface BeforeAgentStartEvent {
  systemPrompt: string;
}

type BeforeAgentStartHandler = (event: BeforeAgentStartEvent) => Promise<{ systemPrompt: string }>;

const promptsDir = '/home/u/.start/prompts';
const skillsDir = '/home/u/.start/agent/skills';

describe('buildStartSystemPrompt', () => {
  it('does not mention pi or any sdk-specific harness', () => {
    const prompt = buildStartSystemPrompt(promptsDir, skillsDir);
    expect(prompt).not.toMatch(/\bpi\b/i);
    expect(prompt).not.toMatch(/TUI/);
    expect(prompt).not.toMatch(/Pi documentation/);
  });

  it('embeds the runtime prompts directory in the documentation block', () => {
    const prompt = buildStartSystemPrompt('/home/u/.start-dev/prompts', '/home/u/.start-dev/agent/skills');
    expect(prompt).toContain('/home/u/.start-dev/prompts/<name>.md');
  });

  it('describes start resource locations without pi docs', () => {
    const prompt = buildStartSystemPrompt(promptsDir, skillsDir);
    expect(prompt).toContain('Resources:');
    expect(prompt).toContain('Project rules: AGENTS.md files in or above cwd.');
    expect(prompt).toContain('Use listed runtime discovery/search tools before broad shell commands.');
    expect(prompt).not.toContain('Prefer grep/find/ls tools');
    expect(prompt).not.toContain('ripgrep');
    expect(prompt).not.toContain('CLAUDE.md');
    expect(prompt).not.toContain('Pi documentation');
  });

  it('defers tool listing until runtime capabilities are available', () => {
    const prompt = buildStartSystemPrompt(promptsDir, skillsDir);
    expect(prompt).toContain('- Runtime tools are loaded from the active session.');
    expect(prompt).not.toContain('other custom tools depending on the project');
    expect(prompt).not.toContain('- read:');
    expect(prompt).not.toContain('- bash:');
    expect(prompt).not.toContain('- edit:');
    expect(prompt).not.toContain('- write:');
  });

  it('preserves response guidance, resource formats, and MCP restrictions', () => {
    const prompt = buildStartSystemPrompt(promptsDir, skillsDir);

    expect(prompt).toContain('expert coding assistant');
    expect(prompt).toContain('Read files, run commands, and write or edit code.');
    expect(prompt).toContain(
      'Be precise and concise. Keep replies under 500 characters by default; expand when asked or when a subagent handoff needs supporting evidence.'
    );
    expect(prompt).toContain('Show file paths clearly');
    expect(prompt).toContain('<skill-name>/SKILL.md with YAML frontmatter and instructions');
    expect(prompt).toContain(`${promptsDir}/<name>.md with YAML frontmatter and prompt text`);
    expect(prompt).toContain(`"mcpServers" entries in <cwd>/.mcp.json or ${globalMcpConfigPath()}`);
    expect(prompt).toContain('Project servers require a remote "url"; "command" servers are global-only.');
    expect(prompt).toContain(`Never store secrets in either file; use \${VAR} environment references.`);
  });

  it('lists active runtime tools from sdk tool info', () => {
    const prompt = buildStartSystemPrompt(promptsDir, skillsDir, {
      getActiveToolNames: () => ['grep', 'browser_open'],
      getAllTools: () => [
        { name: 'read', description: 'Read file contents.' },
        { name: 'grep', description: 'Search file contents.', promptGuidelines: ['Prefer targeted searches.'] },
        { name: 'browser_open', description: 'Open an HTTP or HTTPS URL in the browser panel.' }
      ]
    });

    expect(prompt).toContain('- grep\n');
    expect(prompt).toContain('- browser_open\n');
    expect(prompt).toContain('- Prefer targeted searches.');
    expect(prompt).not.toContain('- read:');
  });

  it('accepts custom tool definition shapes', () => {
    const prompt = buildStartSystemPrompt(promptsDir, skillsDir, {
      getActiveToolNames: () => ['browser_snapshot'],
      getAllTools: () => [
        {
          definition: {
            name: 'browser_snapshot',
            description: 'Read page text, links, headings, and element refs.',
            promptSnippet: 'Use to summarize an open page or find refs for browser_click/browser_type.'
          }
        }
      ]
    });

    expect(prompt).toContain(
      '- browser_snapshot: Use to summarize an open page or find refs for browser_click/browser_type.'
    );
  });

  it('keeps third-party definitions intact without duplicating or truncating their descriptions', () => {
    const description = `${'Search archived records. '.repeat(40)}Only use for archived records; live records require live_search.`;
    const tool = { name: 'archive_search', description };
    const prompt = buildStartSystemPrompt(promptsDir, skillsDir, {
      getAllTools: () => [tool],
      getActiveToolNames: () => [tool.name]
    });
    expect(prompt).not.toContain(description);
    expect(prompt).not.toContain('Search archived records.');
    expect(prompt).toContain('- archive_search\n');
    expect(prompt).toContain("Use each tool's definition for its full purpose, parameters, and usage restrictions.");
    expect(tool.description).toBe(description);
  });

  it('keeps active runtime names even when detailed tool info is absent', () => {
    const prompt = buildStartSystemPrompt(promptsDir, skillsDir, {
      getAllTools: () => [],
      getActiveToolNames: () => ['dynamic_tool']
    });

    expect(prompt).toContain('- dynamic_tool\n');
  });

  it('preserves pi-appended prompt sections when applying capabilities', async () => {
    const prompt = `${buildStartSystemPrompt(promptsDir, skillsDir)}

<project_context>
Project-specific instructions.
</project_context>
Current date: 2026-05-30
Current working directory: /tmp/workspace`;

    const registered: { handler?: BeforeAgentStartHandler } = {};
    const pi = {
      getActiveTools: () => ['grep'],
      getAllTools: () => [{ name: 'grep', description: 'Search file contents.' }],
      on: (_event: 'before_agent_start', nextHandler: BeforeAgentStartHandler) => {
        registered.handler = nextHandler;
      }
    } as unknown as ExtensionAPI;

    createStartPromptExtension(promptsDir, skillsDir)(pi);
    if (!registered.handler) throw new Error('Expected prompt hook registration.');

    const result = await registered.handler({ systemPrompt: prompt });

    expect(result.systemPrompt).toContain('- grep\n');
    expect(result.systemPrompt).toContain('<project_context>');
    expect(result.systemPrompt).toContain('Current date: 2026-05-30');
    expect(result.systemPrompt).toContain('Current working directory: /tmp/workspace');
    expect(result.systemPrompt).toContain(
      'Be precise and concise. Keep replies under 500 characters by default; expand when asked or when a subagent handoff needs supporting evidence.'
    );
    expect(result.systemPrompt).toContain(`Never store secrets in either file; use \${VAR} environment references.`);
  });

  it('applies runtime capabilities through the pi extension prompt hook', async () => {
    const registered: { handler?: BeforeAgentStartHandler } = {};
    const pi = {
      getActiveTools() {
        return ['browser_snapshot'];
      },
      getAllTools(this: { tools: readonly unknown[] }) {
        return this.tools;
      },
      on: (_event: 'before_agent_start', nextHandler: BeforeAgentStartHandler) => {
        registered.handler = nextHandler;
      },
      tools: [
        {
          name: 'browser_snapshot',
          description: 'Read page text, links, headings, and element refs.',
          promptSnippet: 'Use to summarize an open page or find refs for browser_click/browser_type.'
        }
      ]
    } as unknown as ExtensionAPI;

    createStartPromptExtension(promptsDir, skillsDir)(pi);
    if (!registered.handler) throw new Error('Expected prompt hook registration.');

    const result = await registered.handler({
      systemPrompt: `${buildStartSystemPrompt(promptsDir, skillsDir)}
Current date: 2026-05-30`
    });

    expect(result?.systemPrompt).toContain(
      '- browser_snapshot: Use to summarize an open page or find refs for browser_click/browser_type.'
    );
    expect(result?.systemPrompt).toContain('Current date: 2026-05-30');
  });

  it('keeps existing prompt content if the runtime prompt block is missing', async () => {
    const registered: { handler?: BeforeAgentStartHandler } = {};
    const pi = {
      getActiveTools: () => ['grep'],
      getAllTools: () => [{ name: 'grep', description: 'Search file contents.' }],
      on: (_event: 'before_agent_start', nextHandler: BeforeAgentStartHandler) => {
        registered.handler = nextHandler;
      }
    } as unknown as ExtensionAPI;

    createStartPromptExtension(promptsDir, skillsDir)(pi);
    if (!registered.handler) throw new Error('Expected prompt hook registration.');

    const result = await registered.handler({ systemPrompt: 'Current working directory: /tmp/workspace' });

    expect(result.systemPrompt).toContain('- grep\n');
    expect(result.systemPrompt).toContain('Current working directory: /tmp/workspace');
  });

  it('points the model at standard and start-managed skill paths', () => {
    const prompt = buildStartSystemPrompt(promptsDir, skillsDir);
    expect(prompt).toContain('<skill-name>/SKILL.md');
    expect(prompt).toContain('~/.agents/skills');
    expect(prompt).toContain('<cwd>/.agents/skills');
    expect(prompt).toContain(`create Start-managed skills in ${skillsDir}`);
  });

  it('mentions AGENTS.md as the project-context source', () => {
    const prompt = buildStartSystemPrompt(promptsDir, skillsDir);
    expect(prompt).toContain('AGENTS.md');
    expect(prompt).not.toContain('CLAUDE.md');
  });
});
