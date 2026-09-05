import type { SessionManager } from '@earendil-works/pi-coding-agent';
import type { GoalStatus } from '@main/types';
import * as v from 'valibot';

const objectiveSchema = v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(8000));
const reasonSchema = v.pipe(v.string(), v.trim(), v.maxLength(2000));
const goalSchema = v.object({
  objective: objectiveSchema,
  reason: v.exactOptional(reasonSchema),
  iterations: v.pipe(v.number(), v.integer(), v.minValue(0)),
  status: v.picklist(['active', 'paused', 'completed', 'cancelled'])
});

export interface GoalController {
  get: () => GoalStatus | null;
  start: (objective: string) => void;
  pause: (reason?: string) => void;
  resume: () => void;
  cancel: () => void;
  continuation: () => string;
  beginIteration: () => boolean;
  finish: (status: 'completed' | 'blocked', reason: string) => void;
}

export const createGoalController = (
  manager: Pick<SessionManager, 'getBranch' | 'appendCustomEntry'>,
  onChange: () => void
): GoalController => {
  const entry = [...manager.getBranch()]
    .reverse()
    .find((item) => item.type === 'custom' && item.customType === 'start-goal');
  const restored = v.safeParse(goalSchema, entry?.type === 'custom' ? entry.data : null);
  let goal: GoalStatus | null = restored.success ? restored.output : null;
  let runIterations = 0;
  if (goal?.status === 'active') goal = { ...goal, status: 'paused', reason: 'Resume to continue this saved goal.' };

  const save = (next: GoalStatus) => {
    manager.appendCustomEntry('start-goal', next);
    goal = next;
    onChange();
  };

  const pause = (reason = '') => {
    if (goal?.status !== 'active') return;
    const parsedReason = v.parse(reasonSchema, reason);
    const { reason: _previousReason, ...current } = goal;
    save({ ...current, status: 'paused', ...(parsedReason ? { reason: parsedReason } : {}) });
  };

  return {
    get: () => (goal ? { ...goal } : null),
    pause,
    start: (objective) => {
      if (goal?.status === 'active' || goal?.status === 'paused')
        throw new Error('Finish or cancel the current goal first.');
      const parsedObjective = v.parse(objectiveSchema, objective);
      save({ iterations: 0, status: 'active', objective: parsedObjective });
      runIterations = 0;
    },
    resume: () => {
      if (goal?.status !== 'paused') throw new Error('There is no paused goal to resume.');
      const { reason: _previousReason, ...current } = goal;
      save({ ...current, status: 'active' });
      runIterations = 0;
    },
    cancel: () => {
      if (!goal || (goal.status !== 'active' && goal.status !== 'paused')) return;
      const { reason: _previousReason, ...current } = goal;
      save({ ...current, status: 'cancelled' });
    },
    finish: (status, reason) => {
      if (goal?.status !== 'active') throw new Error('There is no active goal to finish.');
      const parsedReason = v.parse(v.pipe(reasonSchema, v.minLength(1)), reason);
      save({ ...goal, status: status === 'completed' ? 'completed' : 'paused', reason: parsedReason });
    },
    beginIteration: () => {
      if (goal?.status !== 'active') return false;
      if (runIterations >= 20) {
        pause('Paused after 20 iterations. Resume to continue.');
        return false;
      }
      save({ ...goal, iterations: goal.iterations + 1 });
      runIterations += 1;
      return true;
    },
    continuation: () => (goal?.status === 'active' ? 'Continue toward the active goal.' : '')
  };
};
