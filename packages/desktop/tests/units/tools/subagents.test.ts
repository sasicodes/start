import { maxSubagentTasks, normalizeSubagentTasks } from '@main/subagents/utils/input';
import { toolEventDetail } from '@main/tools/details';
import { subagentExpandable, subagentSummary } from '@renderer/shared/turn/subagent';
import { describe, expect, it } from 'vitest';

describe('sub-agent tool details', () => {
  const agent = {
    id: 'agent-1',
    name: 'Arul',
    task: 'Review UI.',
    avatar: 'data:image/svg+xml;utf8,test',
    status: 'completed' as const,
    accentColor: '#0f766e'
  };

  it('ignores malformed sub-agent activity details', () => {
    const detail = toolEventDetail({
      state: 'active',
      result: {
        content: [],
        details: {
          agents: [{ id: 'agent-1', name: 'Arul', status: 'unknown' }]
        }
      },
      args: {
        tasks: [
          { prompt: 'Review UI.', model: 'anthropic:claude-opus-4-7', effort: 'low' },
          { prompt: 'Review tests.', model: 'anthropic:claude-opus-4-7', effort: 'low' }
        ]
      },
      key: 'tool:subagents',
      toolName: 'run_workflow'
    });

    expect(detail.title).toBe('Spawning 2 agents');
    expect(detail.metric).toBeUndefined();
    expect(detail.subagents).toBeUndefined();
  });

  it('renders sub-agent activity as structured detail rows', () => {
    const detail = toolEventDetail({
      state: 'active',
      toolName: 'run_workflow',
      key: 'tool:subagents',
      args: { tasks: [{ prompt: 'Review renderer activity UI.', model: 'anthropic:claude-opus-4-7', effort: 'high' }] },
      result: {
        content: [{ text: 'Sub-agents are working.', type: 'text' }],
        details: {
          agents: [
            {
              id: 'agent-1',
              name: 'Arul',
              task: 'Review renderer activity UI.',
              avatar: 'data:image/svg+xml;utf8,test',
              status: 'running',
              accentColor: '#0f766e'
            }
          ]
        }
      }
    });

    expect(detail.title).toBe('Spawning 1 agent');
    expect(detail.detail).toBeUndefined();
    expect(detail.metric).toBeUndefined();
    expect(detail.subagents?.[0]?.name).toBe('Arul');
    expect(detail.subagents?.[0]?.task).toBe('Review renderer activity UI.');
  });

  it('normalizes single-task workflow arguments and requires model and effort', () => {
    const single = { prompt: 'Review renderer activity UI.', model: 'anthropic:claude-opus-4-7', effort: 'low' };
    expect(normalizeSubagentTasks(single)).toEqual([single]);
    expect(normalizeSubagentTasks({ tasks: single })).toEqual([single]);
    expect(
      normalizeSubagentTasks({
        tasks: [
          { prompt: 'Review UI.', model: 'openai:gpt-5.5', effort: 'high' },
          { prompt: 'Review tests.', model: 'anthropic:claude-sonnet-5', effort: 'low' }
        ]
      })
    ).toEqual([
      { prompt: 'Review UI.', model: 'openai:gpt-5.5', effort: 'high' },
      { prompt: 'Review tests.', model: 'anthropic:claude-sonnet-5', effort: 'low' }
    ]);
    expect(normalizeSubagentTasks(['Review UI.', 'Review tests.'])).toEqual([]);
    expect(normalizeSubagentTasks({ tasks: [{ prompt: 'No model or effort.' }] })).toEqual([]);
    expect(normalizeSubagentTasks({ tasks: [{ prompt: '  ', model: 'openai:gpt-5.5', effort: 'low' }] })).toEqual([]);
    expect(normalizeSubagentTasks({})).toEqual([]);

    const detail = toolEventDetail({
      state: 'active',
      toolName: 'run_workflow',
      key: 'tool:subagents',
      args: single
    });

    expect(detail.title).toBe('Spawning 1 agent');
  });

  it('caps normalized tasks at the spawn limit', () => {
    const tasks = Array.from({ length: 12 }, (_, index) => ({
      prompt: `Task ${index}`,
      model: 'anthropic:claude-opus-4-7',
      effort: 'low'
    }));
    const normalized = normalizeSubagentTasks({ tasks });

    expect(maxSubagentTasks).toBe(8);
    expect(normalized).toHaveLength(maxSubagentTasks);
    expect(normalized.at(-1)).toEqual({ prompt: 'Task 7', model: 'anthropic:claude-opus-4-7', effort: 'low' });
  });

  it('expands completed summaries', () => {
    expect(subagentExpandable({ ...agent, summary: 'Done.' })).toBe(true);
    expect(subagentExpandable({ ...agent, status: 'running', summary: 'Partial.' })).toBe(false);
    expect(subagentExpandable({ ...agent, status: 'queued', summary: 'Pending.' })).toBe(false);
    expect(subagentExpandable({ ...agent, summary: '.' })).toBe(false);
    expect(subagentExpandable(agent)).toBe(false);
  });

  it('ignores punctuation-only sub-agent summaries', () => {
    expect(subagentSummary({ ...agent, summary: 'Done.' })).toBe('Done.');
    expect(subagentSummary({ ...agent, summary: ' .' })).toBe('');
  });
});
