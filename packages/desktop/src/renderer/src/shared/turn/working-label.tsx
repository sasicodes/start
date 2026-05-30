import { activityLabel } from '@renderer/shared/turn/label';
import { ShimmerText } from '@renderer/shared/turn/shimmer';
import { useWorkingTime } from '@renderer/shared/turn/working-time';
import type { TurnDetail } from '@renderer/utils/types';

interface WorkingLabelProps {
  createdAt: number;
  details: TurnDetail[];
}

export const WorkingLabel = ({ details, createdAt }: WorkingLabelProps) => {
  const now = useWorkingTime();
  const label = activityLabel({ createdAt, details, now, working: true });

  return <ShimmerText>{label}</ShimmerText>;
};
