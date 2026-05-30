import { DetailItem, ThinkingSection } from '@renderer/shared/turn/item';
import { accordionLayoutTransition, activitySequence } from '@renderer/shared/turn/sequence';
import { SubagentList } from '@renderer/shared/turn/subagents';
import type { TurnActivityItem, TurnDetail } from '@renderer/utils/types';
import { motion } from 'motion/react';

const ActivitySequence = ({ items }: { items: TurnActivityItem[] }) => (
  <motion.ul layout="position" transition={accordionLayoutTransition} class="m-0 flex list-none flex-col gap-2 p-0">
    {items.map((item) =>
      item.type === 'thinking' ? (
        <motion.li key={item.id} layout="position" transition={accordionLayoutTransition} class="m-0">
          <ThinkingSection thinking={item.text} />
        </motion.li>
      ) : (
        <DetailItem
          key={item.id}
          detail={item.detail}
          renderSubagents={(detail) => (detail.subagents ? <SubagentList agents={detail.subagents} /> : null)}
        />
      )
    )}
  </motion.ul>
);

interface ActivityItemsProps {
  thinking: string;
  details: TurnDetail[];
  items: TurnActivityItem[];
}

export const ActivityItems = ({ items, details, thinking }: ActivityItemsProps) => {
  const sequence = activitySequence(details, thinking, items);
  if (sequence.length === 0) return null;

  return (
    <motion.div layout="position" transition={accordionLayoutTransition} class="flex flex-col gap-2">
      <ActivitySequence items={sequence} />
    </motion.div>
  );
};
