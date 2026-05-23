import { hasActivityDetails } from '@renderer/shared/turn/activity';
import { ActivityItems } from '@renderer/shared/turn/items';
import { turnSignal } from '@renderer/state/chat';
import { memo } from 'preact/compat';

interface ActivityPanelProps {
  turnId: string;
}

export const ActivityPanel = memo(({ turnId }: ActivityPanelProps) => {
  const signal = turnSignal(turnId);
  const turn = signal?.value;
  const details = turn?.details ?? [];
  const thinking = turn?.thinking ?? '';

  if (!hasActivityDetails(details, thinking)) return null;

  return (
    <div class="min-h-full outline-0">
      <div class="p-4">
        <ActivityItems details={details} thinking={thinking} />
      </div>
    </div>
  );
});
