import type { WorkflowModelOption } from '@main/subagents/types';
import { workflowModelMenu, workflowToolDescription } from '@main/subagents/utils/catalog';
import { describe, expect, it } from 'vitest';

const option = (overrides: Partial<WorkflowModelOption>): WorkflowModelOption => ({
  key: 'anthropic:claude-opus-4-8',
  name: 'Claude Opus 4 8',
  provider: 'anthropic',
  effortLevels: ['low', 'medium', 'high'],
  score: { affordability: 4, intelligence: 7, taste: 8 },
  ...overrides
});

describe('workflow catalog', () => {
  it('renders one scored line per available model', () => {
    const menu = workflowModelMenu([
      option({ key: 'openai:gpt-5.5', name: 'GPT 5.5', score: { affordability: 9, intelligence: 8, taste: 5 } }),
      option({})
    ]);

    expect(menu).toBe(
      [
        '- openai:gpt-5.5 (GPT 5.5): affordability 9, intelligence 8, taste 5; effort low/medium/high',
        '- anthropic:claude-opus-4-8 (Claude Opus 4 8): affordability 4, intelligence 7, taste 8; effort low/medium/high'
      ].join('\n')
    );
  });

  it('explains scoring and lists models when some are available', () => {
    const description = workflowToolDescription([option({})]);

    expect(description).toContain('higher is better');
    expect(description).toContain('affordability higher means cheaper');
    expect(description).toContain('anthropic:claude-opus-4-8');
  });

  it('tells the agent to set up a provider when nothing is available', () => {
    const description = workflowToolDescription([]);

    expect(description).toContain('No models are configured');
    expect(description).not.toContain('affordability higher means cheaper');
  });
});
