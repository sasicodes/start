import { hasActivityDetails } from '@renderer/shared/turn/activity';
import { activityLabel } from '@renderer/shared/turn/label';
import { tw } from '@renderer/utils/tw';
import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import type { TurnDetail } from '@renderer/utils/types';

interface TurnDetailsProps {
  createdAt: number;
  details: TurnDetail[];
  panelOpen: boolean;
  thinking: string;
  working: boolean;
  onOpenPanel: () => void;
}

interface ActivityTriggerProps {
  children: ComponentChildren;
  panelOpen: boolean;
  onOpenPanel: () => void;
}

const useWorkingTime = () => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setNow(Date.now());
    const interval = window.setInterval(() => setNow(Date.now()), 1000);

    return () => window.clearInterval(interval);
  }, []);

  return now;
};

const WorkingActivityLabel = ({ createdAt, details }: Pick<TurnDetailsProps, 'createdAt' | 'details'>) => {
  const now = useWorkingTime();
  const label = activityLabel({ createdAt, details, now, working: true });
  return (
    <span class="inline-block max-w-full truncate bg-[linear-gradient(100deg,var(--color-soft)_0_42%,oklch(48%_0.16_35_/_0.92)_49%,oklch(70%_0.19_35_/_0.72)_52%,var(--color-soft)_59%_100%)] [background-size:240%_100%] bg-clip-text text-transparent [-webkit-background-clip:text] animate-[activity-text-shimmer_1.8s_linear_infinite] motion-reduce:bg-none motion-reduce:text-soft motion-reduce:animate-none">
      {label}
    </span>
  );
};

const ActivityTrigger = ({ children, panelOpen, onOpenPanel }: ActivityTriggerProps) => (
  <button
    type="button"
    aria-expanded={panelOpen}
    onClick={onOpenPanel}
    class={tw(
      'inline-flex max-w-full items-center gap-1 border-0 bg-transparent p-0 text-left text-xs text-soft outline-0 transition-colors hover:text-hover focus-visible:text-hover',
      panelOpen && 'text-hover'
    )}
  >
    {children}
  </button>
);

export const TurnDetails = ({ createdAt, details, panelOpen, thinking, working, onOpenPanel }: TurnDetailsProps) => {
  const hasDetails = hasActivityDetails(details, thinking);
  if (!working && !hasDetails) return null;

  if (working) {
    return (
      <div class="mb-1.5 max-w-full text-xs text-soft">
        <ActivityTrigger panelOpen={panelOpen} onOpenPanel={onOpenPanel}>
          <WorkingActivityLabel createdAt={createdAt} details={details} />
        </ActivityTrigger>
      </div>
    );
  }

  return (
    <div class="mb-1.5 max-w-full text-xs text-soft">
      <ActivityTrigger panelOpen={panelOpen} onOpenPanel={onOpenPanel}>
        <span class="truncate">{activityLabel({ createdAt, details, working: false })}</span>
      </ActivityTrigger>
    </div>
  );
};
