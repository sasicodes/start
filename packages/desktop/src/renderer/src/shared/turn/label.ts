import { formatDuration } from '@renderer/utils/time';
import type { TurnDetail } from '@renderer/utils/types';

interface ActivityLabelOptions {
  createdAt: number;
  details: TurnDetail[];
  working: boolean;
  now?: number;
}

export const activityLabel = ({ createdAt, details, working, now = Date.now() }: ActivityLabelOptions) => {
  const timestamps = [createdAt, ...details.flatMap((detail) => [detail.createdAt, detail.updatedAt])].filter(
    (timestamp) => timestamp > 0
  );
  const startedAt = timestamps.length > 0 ? Math.min(...timestamps) : now;
  const completedAt = working ? now : timestamps.length > 0 ? Math.max(...timestamps) : now;
  const elapsed = Math.max(0, completedAt - startedAt);

  return `${working ? 'Working' : 'Worked'} ${formatDuration(elapsed)}`;
};
