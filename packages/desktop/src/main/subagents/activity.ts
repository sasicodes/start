import { isRecord, stringValue } from '@main/details';
import type { SubagentActivity } from '@main/types';

const validStatuses = new Set(['cancelled', 'completed', 'failed', 'queued', 'running']);

export const subagentTaskCount = (args: Record<string, unknown>) => (Array.isArray(args.tasks) ? args.tasks.length : 0);

const parseSubagentActivity = (value: unknown): SubagentActivity | null => {
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
  if (!validStatuses.has(status)) return null;

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

export const subagentActivityList = (result: unknown): SubagentActivity[] => {
  if (!isRecord(result) || !isRecord(result.details) || !Array.isArray(result.details.agents)) return [];
  return result.details.agents.flatMap((agent) => {
    const activity = parseSubagentActivity(agent);
    return activity ? [activity] : [];
  });
};
