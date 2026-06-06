import { activityLabelParts } from '@renderer/shared/turn/label';
import { ShimmerText } from '@renderer/shared/turn/shimmer';
import { useWorkingTime } from '@renderer/shared/turn/working-time';
import type { TurnDetail } from '@renderer/utils/types';

interface WorkingProps {
  createdAt: number;
  details: TurnDetail[];
}

export const Working = ({ details, createdAt }: WorkingProps) => {
  const now = useWorkingTime();
  const label = activityLabelParts({ createdAt, details, now, working: true });

  return (
    <ShimmerText>
      {label.verb} <span class="tabular-nums">{label.duration}</span>
    </ShimmerText>
  );
};
