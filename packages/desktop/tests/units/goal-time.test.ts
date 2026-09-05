import type { GoalStatus } from '@preload/index';
import { elapsedGoalTime } from '@renderer/shared/goal/time';
import { expect, it } from 'vitest';

const goal: GoalStatus = { status: 'active', objective: 'Test', iterations: 2, elapsedMs: 5_000, startedAt: 10_000 };

it('adds the current running interval to the saved elapsed time', () => {
  expect(elapsedGoalTime(goal, 14_000)).toBe(9_000);
});

it.each(['paused', 'completed', 'cancelled'] as const)('freezes elapsed time while %s', (status) => {
  expect(elapsedGoalTime({ ...goal, status }, 30_000)).toBe(5_000);
});

it('avoids negative or invented intervals when a clock is behind or the anchor is absent', () => {
  expect(elapsedGoalTime(goal, 8_000)).toBe(5_000);
  expect(elapsedGoalTime({ status: 'active', objective: 'Test', iterations: 0, elapsedMs: 5_000 }, 8_000)).toBe(5_000);
});
