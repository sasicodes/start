import { formatDuration } from '@renderer/utils/time';
import type { TurnDetail } from '@renderer/utils/types';

export const activityLabel = (createdAt: number, details: TurnDetail[], streaming: boolean) => {
  const timestamps = [createdAt, ...details.flatMap((detail) => [detail.createdAt, detail.updatedAt])].filter(
    (timestamp) => timestamp > 0
  );
  const duration = timestamps.length > 0 ? Math.max(...timestamps) - Math.min(...timestamps) : 0;
  const elapsed = streaming ? Date.now() - Math.min(...timestamps, Date.now()) : duration;

  return `Worked ${formatDuration(elapsed)}`;
};
