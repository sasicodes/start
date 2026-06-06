import { isRecord } from '@main/details';
import type { SubagentTaskInput } from '@main/subagents/types';

const parseJson = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const promptFromRecord = (value: Record<string, unknown>): string => {
  const prompt = value.prompt ?? value.task ?? value.description ?? value.instructions;
  return typeof prompt === 'string' ? prompt : '';
};

const normalizeTask = (value: unknown): SubagentTaskInput | null => {
  if (typeof value === 'string') {
    const parsed = parseJson(value);
    if (parsed !== value) return normalizeTask(parsed);
    const prompt = value.trim();
    return prompt ? { prompt } : null;
  }

  if (!isRecord(value)) return null;

  const prompt = promptFromRecord(value).trim();
  return prompt ? { prompt } : null;
};

export const normalizeSubagentTasks = (args: unknown): SubagentTaskInput[] => {
  const input = typeof args === 'string' ? parseJson(args) : args;

  if (Array.isArray(input)) return input.flatMap((task) => normalizeTask(task) ?? []);
  if (!isRecord(input)) return [];

  const rawTasks = input.tasks;
  if (typeof rawTasks === 'string') {
    const parsed = parseJson(rawTasks);
    if (Array.isArray(parsed)) return parsed.flatMap((task) => normalizeTask(task) ?? []);
    const task = normalizeTask(parsed);
    return task ? [task] : [];
  }

  if (Array.isArray(rawTasks)) return rawTasks.flatMap((task) => normalizeTask(task) ?? []);
  if (isRecord(rawTasks)) {
    const task = normalizeTask(rawTasks);
    return task ? [task] : [];
  }

  const task = normalizeTask(input);
  return task ? [task] : [];
};
