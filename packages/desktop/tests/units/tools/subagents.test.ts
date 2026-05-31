import { describe, expect, it } from 'vitest';
import { toolEventDetail } from '@main/tools/details';
import { subagentExpandable, subagentSummary } from '@renderer/shared/turn/subagent';

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
      args: { tasks: [{ prompt: 'Review UI.' }, { prompt: 'Review tests.' }] },
      key: 'tool:subagents',
      toolName: 'subagent_spawn'
    });

    expect(detail.title).toBe('Spawning 2 agents');
    expect(detail.metric).toBeUndefined();
    expect(detail.subagents).toBeUndefined();
  });

  it('renders sub-agent activity as structured detail rows', () => {
    const detail = toolEventDetail({
      state: 'active',
      toolName: 'subagent_spawn',
      key: 'tool:subagents',
      args: { tasks: [{ prompt: 'Review renderer activity UI.' }] },
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

  it('only expands completed sub-agents with a final summary', () => {
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
