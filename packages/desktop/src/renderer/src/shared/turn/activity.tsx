import { ActivityItems } from '@renderer/shared/turn/details';
import { activityLabel } from '@renderer/shared/turn/label';
import { hasActivityDetails } from '@renderer/shared/turn/sequence';
import { WorkingLabel } from '@renderer/shared/turn/working-label';
import { ChevronRightIcon } from '@renderer/ui/icons';
import { closeMotionTransition, openMotionTransition } from '@renderer/ui/motion';
import { tw } from '@renderer/utils/tw';
import type { TurnActivityItem, TurnDetail } from '@renderer/utils/types';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'preact/hooks';

interface TurnActivityProps {
  working: boolean;
  thinking: string;
  createdAt: number;
  details: TurnDetail[];
  items: TurnActivityItem[];
}

export const TurnActivity = ({ items, details, working, thinking, createdAt }: TurnActivityProps) => {
  const [override, setOverride] = useState<boolean | null>(null);
  const hasDetails = hasActivityDetails(details, thinking, items);
  const open = override !== null ? override : working;

  if (!working && !hasDetails) return null;

  const label = working ? (
    <WorkingLabel details={details} createdAt={createdAt} />
  ) : (
    <span class="truncate">{activityLabel({ createdAt, details, working: false })}</span>
  );

  if (!hasDetails) return <div class="mb-1.5 max-w-full text-xs text-soft">{label}</div>;

  return (
    <div class="mb-1.5 max-w-full text-xs text-soft">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOverride(!open)}
        class={tw(
          'inline-flex max-w-full items-center gap-1 border-0 bg-transparent p-0 text-left text-xs text-soft outline-0 transition-colors hover:text-hover focus-visible:text-hover',
          open && 'text-hover'
        )}
      >
        {label}
        <ChevronRightIcon
          class={tw('size-3 flex-none text-soft transition-transform duration-150', open && 'rotate-90')}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="activity"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto', transition: openMotionTransition }}
            exit={{ opacity: 0, height: 0, transition: closeMotionTransition }}
            class="overflow-hidden"
          >
            <div class="pt-2">
              <ActivityItems items={items} details={details} thinking={thinking} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
