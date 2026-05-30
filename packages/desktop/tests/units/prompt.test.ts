import { describe, expect, it } from 'vitest';
import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';
import { buildStartSystemPrompt, createStartPromptExtension } from '@main/prompt/index';

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
    expect(prompt).toContain('Project and user resources:');
    expect(prompt).toContain('Project rules come from AGENTS.md and CLAUDE.md');
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

  it('lists active runtime tools from sdk tool info', () => {
    const prompt = buildStartSystemPrompt(promptsDir, skillsDir, {
      getActiveToolNames: () => ['grep', 'browser_open'],
      getAllTools: () => [
        { name: 'read', description: 'Read file contents.' },
        { name: 'grep', description: 'Search file contents.', promptGuidelines: ['Prefer targeted searches.'] },
        { name: 'browser_open', description: 'Open an HTTP or HTTPS URL in the browser panel.' }
      ]
    });

    expect(prompt).toContain('- grep: Search file contents.');
    expect(prompt).toContain('- browser_open: Open an HTTP or HTTPS URL in the browser panel.');
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

  it('keeps active runtime names even when detailed tool info is absent', () => {
    const prompt = buildStartSystemPrompt(promptsDir, skillsDir, {
      getAllTools: () => [],
      getActiveToolNames: () => ['dynamic_tool']
    });

    expect(prompt).toContain('- dynamic_tool: Available runtime tool.');
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

    expect(result.systemPrompt).toContain('- grep: Search file contents.');
    expect(result.systemPrompt).toContain('<project_context>');
    expect(result.systemPrompt).toContain('Current date: 2026-05-30');
    expect(result.systemPrompt).toContain('Current working directory: /tmp/workspace');
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

    expect(result.systemPrompt).toContain('- grep: Search file contents.');
    expect(result.systemPrompt).toContain('Current working directory: /tmp/workspace');
  });

  it('points the model at standard and start-managed skill paths', () => {
    const prompt = buildStartSystemPrompt(promptsDir, skillsDir);
    expect(prompt).toContain('~/.agents/skills/<skill-name>/SKILL.md');
    expect(prompt).toContain(`${skillsDir}/<skill-name>/SKILL.md`);
    expect(prompt).toContain('<cwd>/.agents/skills/<skill-name>/SKILL.md');
  });

  it('mentions AGENTS.md and CLAUDE.md as project-context sources', () => {
    const prompt = buildStartSystemPrompt(promptsDir, skillsDir);
    expect(prompt).toContain('AGENTS.md');
    expect(prompt).toContain('CLAUDE.md');
  });
});
