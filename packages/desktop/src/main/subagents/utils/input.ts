import { isRecord } from '@main/details';
import type { SubagentTaskInput } from '@main/subagents/types';
import { effortLevels } from '@main/types';
import * as v from 'valibot';

const taskSchema = v.object({
  effort: v.picklist(effortLevels),
  model: v.pipe(v.string(), v.trim(), v.minLength(1)),
  prompt: v.pipe(v.string(), v.trim(), v.minLength(1))
}) satisfies v.GenericSchema<unknown, SubagentTaskInput>;

export const maxSubagentTasks = 8;

export const normalizeSubagentTasks = (args: unknown): SubagentTaskInput[] => {
  const raw = isRecord(args) && 'tasks' in args ? args.tasks : args;
  const list = Array.isArray(raw) ? raw : [raw];

  return list
    .flatMap((task) => {
      const result = v.safeParse(taskSchema, task);
      return result.success ? [result.output] : [];
    })
    .slice(0, maxSubagentTasks);
};
