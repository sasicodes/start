import { activityLabel } from '@renderer/shared/turn/label';
import { ShimmerText } from '@renderer/shared/turn/shimmer';
import { useWorkingTime } from '@renderer/shared/turn/working-time';
import type { TurnDetail } from '@renderer/utils/types';

interface WorkingProps {
  createdAt: number;
  details: TurnDetail[];
}

export const Working = ({ details, createdAt }: WorkingProps) => {
  const now = useWorkingTime();
  const label = activityLabel({ createdAt, details, now, working: true });

  return <ShimmerText>{label}</ShimmerText>;
};
