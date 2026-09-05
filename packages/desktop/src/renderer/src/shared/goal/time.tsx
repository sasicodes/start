import type { GoalStatus } from '@preload/index';
import { useWorkingTime } from '@renderer/shared/turn/working-time';
import { formatDuration } from '@renderer/utils/time';

interface GoalTimeProps {
  goal: GoalStatus;
}

export const elapsedGoalTime = (goal: GoalStatus, now: number) =>
  goal.elapsedMs + (goal.status === 'active' ? Math.max(0, now - (goal.startedAt ?? now)) : 0);

const RunningTime = ({ goal }: GoalTimeProps) => formatDuration(elapsedGoalTime(goal, useWorkingTime()));

export const GoalTime = ({ goal }: GoalTimeProps) => (
  <span class="shrink-0 px-1 text-xs text-soft tabular-nums" title="Time spent on this goal">
    {goal.status === 'active' && 'startedAt' in goal ? <RunningTime goal={goal} /> : formatDuration(goal.elapsedMs)}
  </span>
);
