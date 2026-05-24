import { hasActivityDetails } from '@renderer/shared/turn/activity';
import { ActivityItems } from '@renderer/shared/turn/items';
import { turnSignal } from '@renderer/state/chat';
import { memo } from 'preact/compat';

interface ActivityPanelProps {
  turnId: string;
}

export const ActivityPanel = memo(({ turnId }: ActivityPanelProps) => {
  const turn = turnSignal(turnId)?.value;
  const details = turn?.details ?? [];
  const thinking = turn?.thinking ?? '';
  const items = turn?.activityItems ?? [];

  if (!hasActivityDetails(details, thinking, items)) return null;

  return (
    <div class="min-h-full outline-0">
      <div class="p-4">
        <ActivityItems items={items} details={details} thinking={thinking} />
      </div>
    </div>
  );
});
