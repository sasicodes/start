import type { SubagentActivity } from '@preload/index';
import { Markdown } from '@renderer/markdown';
import { accordionContentMotion, accordionLayoutTransition } from '@renderer/shared/turn/sequence';
import { ShimmerText } from '@renderer/shared/turn/shimmer';
import {
  subagentActivityLabel,
  subagentExpandable,
  subagentStatusLabel,
  subagentSummary
} from '@renderer/shared/turn/subagent';
import { useWorkingTime } from '@renderer/shared/turn/working-time';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'preact/hooks';

const AgentName = ({ agent, live }: { agent: SubagentActivity; live: boolean }) => {
  if (live && agent.status === 'running') {
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

interface AgentProps {
  live: boolean;
  agent: SubagentActivity;
}

const RowContent = ({ agent, live }: AgentProps) => {
  const status = subagentStatusLabel(agent, live);
  const modelLabel = agent.model ? `${agent.model}${agent.effort ? ` (${agent.effort})` : ''}` : '';

  return (
    <>
      <img alt="" draggable={false} src={agent.avatar} class="size-4 flex-none rounded-full" />
      <span class="flex min-w-0 flex-1 items-center gap-1.5 leading-4 text-soft">
        <AgentName agent={agent} live={live} />
        <span class="shrink-0 text-soft">-</span>
        {modelLabel && (
          <>
            <span class="shrink-0 text-soft">{modelLabel}</span>
            <span class="shrink-0 text-soft">-</span>
          </>
        )}
        <span class="min-w-0 truncate text-soft">{agent.task}</span>
        {status && <span class="shrink-0 text-xs text-soft">{status}</span>}
      </span>
    </>
  );
};

const SubagentRow = ({ agent, live }: AgentProps) => {
  const [open, setOpen] = useState(false);
  const summary = subagentSummary(agent);
  const expandable = subagentExpandable(agent);

  if (!expandable) {
    return (
      <motion.li
        layout="position"
        transition={accordionLayoutTransition}
        class="m-0 flex w-full min-w-0 items-center gap-1.5"
      >
        <RowContent agent={agent} live={live} />
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
        <RowContent agent={agent} live={live} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div key="subagent-summary" {...accordionContentMotion} class="overflow-hidden">
            <div class="pt-1.5 leading-5 text-soft [overflow-wrap:anywhere]">
              {agent.status === 'running' ? (
                live ? (
                  <LiveActivity agent={agent} />
                ) : (
                  subagentActivityLabel(agent, Date.now(), false)
                )
              ) : (
                <Markdown source={summary} density="compact" />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
};

const LiveActivity = ({ agent }: { agent: SubagentActivity }) => subagentActivityLabel(agent, useWorkingTime(), true);

export const SubagentList = ({ agents, live = false }: { agents: SubagentActivity[]; live?: boolean }) => {
  if (agents.length === 0) return null;

  return (
    <motion.ul layout="position" transition={accordionLayoutTransition} class="m-0 flex list-none flex-col gap-2 p-0">
      {agents.map((agent) => (
        <SubagentRow key={agent.id} agent={agent} live={live} />
      ))}
    </motion.ul>
  );
};
