import type { SubagentActivity } from '@preload/index';

const meaningfulSummaryPattern = /[\p{L}\p{N}]/u;

export const subagentSummary = (agent: SubagentActivity) => {
  const summary = agent.summary?.trim() ?? '';
  return meaningfulSummaryPattern.test(summary) ? summary : '';
};

export const subagentExpandable = (agent: SubagentActivity) =>
  Boolean(
    (agent.status === 'running' && agent.activity) ||
      (subagentSummary(agent) && agent.status !== 'queued' && agent.status !== 'running')
  );

export const subagentStatusLabel = (agent: SubagentActivity, live: boolean) => {
  if (agent.status === 'running' && !live) return '';
  return agent.status.charAt(0).toUpperCase() + agent.status.slice(1);
};

export const subagentActivityLabel = (agent: SubagentActivity, now: number, live: boolean) => {
  const activity = agent.activity || 'Waiting for activity';
  if (!live) return `At this checkpoint: ${activity}`;
  const minutes = agent.lastActivityAt ? Math.max(0, Math.floor((now - agent.lastActivityAt) / 60000)) : 0;
  return minutes >= 5 ? `${activity}. No activity for ${minutes}m.` : activity;
};
