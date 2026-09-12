import type { SubagentActivity } from '@preload/index';
import { subagentActivityLabel, subagentExpandable, subagentStatusLabel } from '@renderer/shared/turn/subagent';
import { describe, expect, it } from 'vitest';

const agent: SubagentActivity = {
  id: '1',
  name: 'Test',
  avatar: '',
  accentColor: '',
  task: 'Inspect code',
  status: 'running',
  activity: 'Running bash',
  lastActivityAt: 1000
};

describe('subagent status', () => {
  it('reports silence without declaring failure', () => {
    expect(subagentStatusLabel(agent, true)).toBe('Running');
    expect(subagentActivityLabel(agent, 301000, true)).toBe('Running bash. No activity for 5m.');
    expect(subagentExpandable(agent)).toBe(true);
    expect(agent.status).toBe('running');
  });
  it('labels historical snapshots without implying live activity', () => {
    expect(subagentStatusLabel(agent, false)).toBe('');
    expect(subagentActivityLabel(agent, 301000, false)).toBe('At this checkpoint: Running bash');
  });
  it('shows current activity and terminal outcomes', () => {
    expect(subagentStatusLabel(agent, true)).toBe('Running');
    expect(subagentActivityLabel(agent, 2000, true)).toBe('Running bash');
    for (const status of ['completed', 'failed', 'cancelled', 'queued'] as const) {
      expect(subagentStatusLabel({ ...agent, status }, false)).toBe(status.charAt(0).toUpperCase() + status.slice(1));
    }
  });
});
