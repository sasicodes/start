import { hasActivityDetails } from '@renderer/shared/turn/activity';
import { activityLabel } from '@renderer/shared/turn/label';
import { cn } from '@renderer/utils/cn';
import type { TurnDetail } from '@renderer/utils/types';

type TurnDetailsProps = {
  createdAt: number;
  details: TurnDetail[];
  panelOpen: boolean;
  streaming: boolean;
  thinking: string;
  onOpenPanel: () => void;
};

export const TurnDetails = ({ details, thinking, createdAt, streaming, panelOpen, onOpenPanel }: TurnDetailsProps) => {
  if (!hasActivityDetails(details, thinking)) return null;

  const label = activityLabel(createdAt, details, streaming);

  return (
    <div class="mb-1.5 max-w-full text-xs text-soft">
      <button
        type="button"
        aria-expanded={panelOpen}
        onClick={onOpenPanel}
        class={cn(
          'inline-flex max-w-full items-center gap-1 border-0 bg-transparent p-0 text-left text-xs text-soft outline-0 transition-colors hover:text-hover focus-visible:text-hover',
          panelOpen && 'text-hover'
        )}
      >
        <span class="truncate">{label}</span>
      </button>
    </div>
  );
};
