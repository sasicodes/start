import { describe, expect, it } from 'vitest';
import { buildStartSystemPrompt } from '@main/system-prompt';

describe('buildStartSystemPrompt', () => {
  it('does not mention pi or any sdk-specific harness', () => {
    const prompt = buildStartSystemPrompt('/home/u/.start/prompts');
    expect(prompt).not.toMatch(/\bpi\b/i);
    expect(prompt).not.toMatch(/TUI/);
    expect(prompt).not.toMatch(/Pi documentation/);
  });

  it('embeds the runtime prompts directory in the documentation block', () => {
    const prompt = buildStartSystemPrompt('/home/u/.start-dev/prompts');
    expect(prompt).toContain('/home/u/.start-dev/prompts/<name>.md');
  });

  it('lists the standard built-in tools', () => {
    const prompt = buildStartSystemPrompt('/whatever');
    expect(prompt).toContain('- read:');
    expect(prompt).toContain('- bash:');
    expect(prompt).toContain('- edit:');
    expect(prompt).toContain('- write:');
  });

  it('points the model at .agents/skills/ for new skills', () => {
    const prompt = buildStartSystemPrompt('/whatever');
    expect(prompt).toContain('<cwd>/.agents/skills/<skill-name>/SKILL.md');
  });

  it('mentions AGENTS.md and CLAUDE.md as project-context sources', () => {
    const prompt = buildStartSystemPrompt('/whatever');
    expect(prompt).toContain('AGENTS.md');
    expect(prompt).toContain('CLAUDE.md');
  });
});
