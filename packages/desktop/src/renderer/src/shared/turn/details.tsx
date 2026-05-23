import { hasActivityDetails } from '@renderer/shared/turn/activity';
import { ActivityTrigger } from '@renderer/shared/turn/activity-trigger';
import { activityLabel } from '@renderer/shared/turn/label';
import { WorkingLabel } from '@renderer/shared/turn/working-label';
import type { TurnDetail } from '@renderer/utils/types';

interface TurnDetailsProps {
  working: boolean;
  thinking: string;
  createdAt: number;
  panelOpen: boolean;
  details: TurnDetail[];
  onOpenPanel: () => void;
}

export const TurnDetails = ({ details, working, thinking, createdAt, panelOpen, onOpenPanel }: TurnDetailsProps) => {
  const hasDetails = hasActivityDetails(details, thinking);
  if (!working && !hasDetails) return null;

  if (working) {
    return (
      <div class="mb-1.5 max-w-full text-xs text-soft">
        <ActivityTrigger open={panelOpen} onOpen={onOpenPanel}>
          <WorkingLabel details={details} createdAt={createdAt} />
        </ActivityTrigger>
      </div>
    );
  }

  return (
    <div class="mb-1.5 max-w-full text-xs text-soft">
      <ActivityTrigger open={panelOpen} onOpen={onOpenPanel}>
        <span class="truncate">{activityLabel({ createdAt, details, working: false })}</span>
      </ActivityTrigger>
    </div>
  );
};
