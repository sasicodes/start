import { Markdown } from '@renderer/markdown';
import type { ParsedSkillBlock } from '@renderer/shared/skill/parse';
import { accordionContentMotion } from '@renderer/shared/turn/sequence';
import { ChevronDownIcon } from '@renderer/ui/icons';
import { tw } from '@renderer/utils/tw';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'preact/hooks';

export const SkillMessage = ({ block }: { block: ParsedSkillBlock }) => {
  const [open, setOpen] = useState(false);

  return (
    <div class="flex w-full flex-col items-end gap-1.5">
      {block.userMessage && (
        <div class="w-fit max-w-full rounded-[18px] rounded-br-md bg-composer px-4 py-2 text-sm leading-6 whitespace-pre-wrap [overflow-wrap:anywhere]">
          {block.userMessage}
        </div>
      )}
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        class="group/skill inline-flex items-center gap-1 border-0 bg-transparent p-0 text-xs leading-4 font-medium text-soft outline-0 transition-colors hover:text-hover focus-visible:text-hover"
      >
        <span class="text-soft">Skill</span>
        <span class="text-ink">{block.name}</span>
        <ChevronDownIcon class={tw('size-3 transition-transform duration-150 ease-out', open && 'rotate-180')} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div key="skill-content" {...accordionContentMotion} class="w-full overflow-hidden">
            <div class="rounded-[18px] bg-composer px-4 py-2 text-left text-sm leading-6 text-soft [overflow-wrap:anywhere]">
              <Markdown source={block.content} density="compact" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
