import { isRecord, stringValue } from '@main/details';
import type { SubagentActivity } from '@main/types';

const subagentStatuses = new Set(['cancelled', 'completed', 'failed', 'queued', 'running']);

export const subagentTaskCount = (args: Record<string, unknown>) => (Array.isArray(args.tasks) ? args.tasks.length : 0);

const subagentActivity = (value: unknown): SubagentActivity | null => {
  if (!isRecord(value)) return null;

  const id = stringValue(value.id);
  const name = stringValue(value.name);
  const task = stringValue(value.task);
  const logs = Array.isArray(value.logs) ? value.logs.flatMap((log) => (typeof log === 'string' ? [log] : [])) : [];
  const avatar = stringValue(value.avatar);
  const status = stringValue(value.status);
  const summary = stringValue(value.summary);
  const accentColor = stringValue(value.accentColor);
  if (!id || !name || !task || !avatar || !accentColor) return null;
  if (!subagentStatuses.has(status)) return null;

  return {
    id,
    name,
    task,
    logs,
    avatar,
    accentColor,
    status: status as SubagentActivity['status'],
    ...(summary ? { summary } : {})
  };
};

export const subagentActivities = (result: unknown): SubagentActivity[] => {
  if (!isRecord(result) || !isRecord(result.details) || !Array.isArray(result.details.agents)) return [];
  return result.details.agents.flatMap((agent) => {
    const activity = subagentActivity(agent);
    return activity ? [activity] : [];
  });
};
