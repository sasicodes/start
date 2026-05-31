import type { SubagentActivity } from '@preload/index';
import { Markdown } from '@renderer/markdown';
import { ShimmerText } from '@renderer/shared/turn/shimmer';
import { subagentExpandable, subagentSummary } from '@renderer/shared/turn/subagent';
import { accordionContentMotion, accordionLayoutTransition } from '@renderer/shared/turn/sequence';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'preact/hooks';

const AgentName = ({ agent }: { agent: SubagentActivity }) => {
  if (agent.status === 'running') {
    return (
      <ShimmerText className="shrink-0 text-ink group-hover/subagent:text-hover group-focus-visible/subagent:text-hover">
        {agent.name}
      </ShimmerText>
    );
  }

  return (
    <span class="shrink-0 text-ink group-hover/subagent:text-hover group-focus-visible/subagent:text-hover">
      {agent.name}
    </span>
  );
};

const SubagentRow = ({ agent }: { agent: SubagentActivity }) => {
  const [open, setOpen] = useState(false);
  const summary = subagentSummary(agent);
  const expandable = subagentExpandable(agent);
  const content = (
    <>
      <img alt="" src={agent.avatar} class="size-4 flex-none rounded-full" />
      <span class="flex min-w-0 flex-1 items-center gap-1.5 text-xs leading-4 text-soft">
        <AgentName agent={agent} />
        <span class="shrink-0 text-soft">-</span>
        <span class="min-w-0 truncate text-soft">{agent.task}</span>
      </span>
    </>
  );

  if (!expandable) {
    return (
      <motion.li
        layout="position"
        transition={accordionLayoutTransition}
        class="m-0 flex w-full min-w-0 items-center gap-1.5"
      >
        {content}
      </motion.li>
    );
  }

  return (
    <motion.li layout="position" transition={accordionLayoutTransition} class="m-0">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        class="group/subagent flex w-full min-w-0 items-center gap-1.5 border-0 bg-transparent p-0 text-left outline-0 transition-colors hover:text-hover focus-visible:text-hover"
      >
        {content}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div key="subagent-summary" {...accordionContentMotion} class="overflow-hidden">
            <div class="pt-1.5 text-xs leading-5 text-soft [overflow-wrap:anywhere]">
              <Markdown source={summary} density="compact" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
};

export const SubagentList = ({ agents }: { agents: SubagentActivity[] }) => {
  if (agents.length === 0) return null;

  return (
    <motion.ul layout="position" transition={accordionLayoutTransition} class="m-0 flex list-none flex-col gap-2 p-0">
      {agents.map((agent) => (
        <SubagentRow key={agent.id} agent={agent} />
      ))}
    </motion.ul>
  );
};
