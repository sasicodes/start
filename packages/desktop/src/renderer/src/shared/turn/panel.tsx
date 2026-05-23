import { ActivityItems } from '@renderer/shared/turn/items';
import type { TurnDetail } from '@renderer/utils/types';

type ActivityPanelProps = {
  details: TurnDetail[];
  thinking: string;
};

export const ActivityPanel = ({ details, thinking }: ActivityPanelProps) => {
  return (
    <div class="h-full min-h-0 overflow-y-auto px-4 pt-9 pb-5 outline-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <ActivityItems details={details} thinking={thinking} />
    </div>
  );
};
