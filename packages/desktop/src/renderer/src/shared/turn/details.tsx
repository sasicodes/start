import { hasActivityDetails } from '@renderer/shared/turn/activity';
import { activityLabel } from '@renderer/shared/turn/label';
import { tw } from '@renderer/utils/tw';
import type { TurnDetail } from '@renderer/utils/types';
import { useEffect, useState } from 'preact/hooks';

interface TurnDetailsProps {
  createdAt: number;
  details: TurnDetail[];
  panelOpen: boolean;
  thinking: string;
  working: boolean;
  onOpenPanel: () => void;
}

const useWorkingTime = (working: boolean) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!working) return;

    setNow(Date.now());
    const interval = window.setInterval(() => setNow(Date.now()), 1000);

    return () => window.clearInterval(interval);
  }, [working]);

  return now;
};

export const TurnDetails = ({ createdAt, details, panelOpen, thinking, working, onOpenPanel }: TurnDetailsProps) => {
  const hasDetails = hasActivityDetails(details, thinking);
  const now = useWorkingTime(working);
  if (!working && !hasDetails) return null;

  const label = activityLabel({ createdAt, details, now, working });

  return (
    <div class="mb-1.5 max-w-full text-xs text-soft">
      <button
        type="button"
        aria-expanded={panelOpen}
        onClick={onOpenPanel}
        class={tw(
          'inline-flex max-w-full items-center gap-1 border-0 bg-transparent p-0 text-left text-xs text-soft outline-0 transition-colors hover:text-hover focus-visible:text-hover',
          panelOpen && 'text-hover',
          working && 'animate-pulse'
        )}
      >
        <span class="truncate">{label}</span>
      </button>
    </div>
  );
};
