import * as v from 'valibot';
import { isRecord } from '@main/details';
import type { SubagentActivity } from '@main/types';

const subagentStatusSchema = v.picklist(['cancelled', 'completed', 'failed', 'queued', 'running']);

const subagentActivitySchema = v.object({
  id: v.string(),
  name: v.string(),
  task: v.string(),
  avatar: v.string(),
  summary: v.optional(v.string()),
  accentColor: v.string(),
  status: subagentStatusSchema
});

export const subagentTaskCount = (args: Record<string, unknown>) => (Array.isArray(args.tasks) ? args.tasks.length : 0);

const parseSubagentActivity = (value: unknown): SubagentActivity | null => {
  const result = v.safeParse(subagentActivitySchema, value);
  if (!result.success) return null;

  const activity = result.output;
  if (!activity.id || !activity.name || !activity.task || !activity.avatar || !activity.accentColor) return null;

  return {
    id: activity.id,
    name: activity.name,
    task: activity.task,
    avatar: activity.avatar,
    status: activity.status,
    accentColor: activity.accentColor,
    ...(activity.summary ? { summary: activity.summary } : {})
  };
};

export const subagentActivityList = (result: unknown): SubagentActivity[] => {
  if (!isRecord(result) || !isRecord(result.details) || !Array.isArray(result.details.agents)) return [];
  return result.details.agents.flatMap((agent) => {
    const activity = parseSubagentActivity(agent);
    return activity ? [activity] : [];
  });
};
