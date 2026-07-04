import { isRecord } from '@main/details';
import type { SubagentTaskInput } from '@main/subagents/types';
import * as v from 'valibot';

const taskSchema = v.pipe(
  v.union([
    v.string(),
    v.pipe(
      v.object({ prompt: v.string() }),
      v.transform((task) => task.prompt)
    )
  ]),
  v.trim(),
  v.minLength(1),
  v.transform((prompt) => ({ prompt }) satisfies SubagentTaskInput)
);

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
