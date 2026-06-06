import type { SubagentActivity } from '@preload/index';

const meaningfulSummaryPattern = /[\p{L}\p{N}]/u;

export const subagentSummary = (agent: SubagentActivity) => {
  const summary = agent.summary?.trim() ?? '';
  return meaningfulSummaryPattern.test(summary) ? summary : '';
};

export const subagentExpandable = (agent: SubagentActivity) =>
  Boolean(
    (agent.toolEvents && agent.toolEvents.length > 0) ||
      (subagentSummary(agent) && agent.status !== 'queued' && agent.status !== 'running')
  );
