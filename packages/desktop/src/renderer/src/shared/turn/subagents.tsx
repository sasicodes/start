import type { SubagentActivity } from '@preload/index';
import { DetailItem } from '@renderer/shared/turn/detail';
import { accordionContentMotion, accordionLayoutTransition } from '@renderer/shared/turn/sequence';
import { ChevronRightIcon } from '@renderer/ui/icons';
import { tw } from '@renderer/utils/tw';
import type { TurnDetail } from '@renderer/utils/types';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'preact/hooks';

const logEvent = (agent: SubagentActivity, log: string, index: number): TurnDetail => ({
  count: 1,
  id: `${agent.id}:log:${index}`,
  key: `${agent.id}:log:${index}`,
  kind: 'metadata',
  state: 'done',
  title: log,
  createdAt: 0,
  updatedAt: 0
});

const summaryEvent = (agent: SubagentActivity): TurnDetail | null => {
  if (!agent.summary) return null;

  return {
    body: agent.summary,
    count: 1,
    id: `${agent.id}:summary`,
    key: `${agent.id}:summary`,
    kind: 'metadata',
    state: 'done',
    title: `From ${agent.name}`,
    createdAt: 0,
    updatedAt: 0
  };
};

const agentEvents = (agent: SubagentActivity) => {
  const events = agent.logs.map((log, index) => logEvent(agent, log, index));
  const summary = summaryEvent(agent);
  return summary ? [...events, summary] : events;
};

const AgentName = ({ agent }: { agent: SubagentActivity }) => (
  <span
    class={tw(
      'shrink-0 text-ink group-hover/subagent:text-hover group-focus-visible/subagent:text-hover',
      agent.status === 'running' &&
        'inline-block max-w-full truncate bg-[linear-gradient(100deg,var(--color-soft)_0_42%,oklch(48%_0.16_35_/_0.92)_49%,oklch(70%_0.19_35_/_0.72)_52%,var(--color-soft)_59%_100%)] [background-size:240%_100%] bg-clip-text text-transparent [-webkit-background-clip:text] animate-[activity-text-shimmer_1.8s_linear_infinite] motion-reduce:bg-none motion-reduce:text-soft motion-reduce:animate-none'
    )}
  >
    {agent.name}
  </span>
);

const SubagentLogs = ({ agent }: { agent: SubagentActivity }) => {
  const events = agentEvents(agent);
  if (events.length === 0) return null;

  return (
    <motion.ul layout="position" transition={accordionLayoutTransition} class="m-0 flex list-none flex-col gap-2 p-0">
      {events.map((detail) => (
        <DetailItem key={detail.id} detail={detail} />
      ))}
    </motion.ul>
  );
};

const SubagentRow = ({ agent }: { agent: SubagentActivity }) => {
  const [open, setOpen] = useState(false);

  return (
    <motion.li layout="position" transition={accordionLayoutTransition} class="m-0">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        class="group/subagent flex w-full min-w-0 items-center gap-1.5 border-0 bg-transparent p-0 text-left outline-0 transition-colors hover:text-hover focus-visible:text-hover"
      >
        <img alt="" src={agent.avatar} class="size-4 flex-none rounded-full" />
        <span class="flex min-w-0 flex-1 items-center gap-1.5 text-sm leading-5 text-soft">
          <AgentName agent={agent} />
          <span class="shrink-0 text-soft">-</span>
          <span class="min-w-0 truncate text-soft">{agent.task}</span>
        </span>
        <ChevronRightIcon
          class={tw('size-3 flex-none text-soft transition-transform duration-150', open && 'rotate-90')}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div key="subagent-logs" {...accordionContentMotion} class="overflow-hidden">
            <div class="pt-2">
              <SubagentLogs agent={agent} />
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
