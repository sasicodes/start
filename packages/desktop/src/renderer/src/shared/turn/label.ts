import { formatDuration } from '@renderer/utils/time';
import type { TurnDetail } from '@renderer/utils/types';

interface ActivityLabelOptions {
  createdAt: number;
  details: TurnDetail[];
  now: number;
  working: boolean;
}

export const activityLabel = ({ createdAt, details, now, working }: ActivityLabelOptions) => {
  const timestamps = [createdAt, ...details.flatMap((detail) => [detail.createdAt, detail.updatedAt])].filter(
    (timestamp) => timestamp > 0
  );
  const startedAt = Math.min(...timestamps, now);
  const completedAt = timestamps.length > 0 ? Math.max(...timestamps) : now;
  const elapsed = Math.max(0, (working ? now : completedAt) - startedAt);

  return `${working ? 'Working' : 'Worked'} ${formatDuration(elapsed)}`;
};
