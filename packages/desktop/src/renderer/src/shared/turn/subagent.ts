import type { SubagentActivity } from '@preload/index';

const meaningfulSummaryPattern = /[\p{L}\p{N}]/u;

export const subagentSummary = (agent: SubagentActivity) => {
  const summary = agent.summary?.trim() ?? '';
  return meaningfulSummaryPattern.test(summary) ? summary : '';
};

export const subagentExpandable = (agent: SubagentActivity) =>
  Boolean(subagentSummary(agent) && agent.status !== 'queued' && agent.status !== 'running');
