import { describe, expect, it } from 'vitest';
import { toolEventDetail } from '@main/tools/details';

describe('sub-agent tool details', () => {
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
    expect(detail.metric).toBe('2 agents');
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
              accentColor: '#0f766e',
              logs: ['Started']
            }
          ]
        }
      }
    });

    expect(detail.title).toBe('Spawning 1 agent');
    expect(detail.metric).toBeUndefined();
    expect(detail.subagents?.[0]?.name).toBe('Arul');
    expect(detail.subagents?.[0]?.task).toBe('Review renderer activity UI.');
  });
});
