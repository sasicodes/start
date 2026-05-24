import { hasActivityDetails } from '@renderer/shared/turn/activity';
import { ActivityTrigger } from '@renderer/shared/turn/activity-trigger';
import { activityLabel } from '@renderer/shared/turn/label';
import { WorkingLabel } from '@renderer/shared/turn/working-label';
import type { TurnActivityItem, TurnDetail } from '@renderer/utils/types';

interface TurnDetailsProps {
  working: boolean;
  thinking: string;
  createdAt: number;
  panelOpen: boolean;
  details: TurnDetail[];
  onOpenPanel: () => void;
  items: TurnActivityItem[];
}

export const TurnDetails = ({
  items,
  details,
  working,
  thinking,
  createdAt,
  panelOpen,
  onOpenPanel
}: TurnDetailsProps) => {
  const hasDetails = hasActivityDetails(details, thinking, items);
  if (!working && !hasDetails) return null;
  const label = working ? (
    <WorkingLabel details={details} createdAt={createdAt} />
  ) : (
    <span class="truncate">{activityLabel({ createdAt, details, working: false })}</span>
  );

  if (!hasDetails) return <div class="mb-1.5 max-w-full text-xs text-soft">{label}</div>;

  return (
    <div class="mb-1.5 max-w-full text-xs text-soft">
      <ActivityTrigger open={panelOpen} onOpen={onOpenPanel}>
        {label}
      </ActivityTrigger>
    </div>
  );
};
