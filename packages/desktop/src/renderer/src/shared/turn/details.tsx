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
  working: boolean;
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
  return <span class="truncate">{activityLabel({ createdAt, details, now, working: true })}</span>;
};

const ActivityTrigger = ({ children, panelOpen, working, onOpenPanel }: ActivityTriggerProps) => (
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
    {children}
  </button>
);

export const TurnDetails = ({ createdAt, details, panelOpen, thinking, working, onOpenPanel }: TurnDetailsProps) => {
  const hasDetails = hasActivityDetails(details, thinking);
  if (!working && !hasDetails) return null;

  if (working) {
    return (
      <div class="mb-1.5 max-w-full text-xs text-soft">
        <ActivityTrigger panelOpen={panelOpen} working={working} onOpenPanel={onOpenPanel}>
          <WorkingActivityLabel createdAt={createdAt} details={details} />
        </ActivityTrigger>
      </div>
    );
  }

  return (
    <div class="mb-1.5 max-w-full text-xs text-soft">
      <ActivityTrigger panelOpen={panelOpen} working={working} onOpenPanel={onOpenPanel}>
        <span class="truncate">{activityLabel({ createdAt, details, working: false })}</span>
      </ActivityTrigger>
    </div>
  );
};
