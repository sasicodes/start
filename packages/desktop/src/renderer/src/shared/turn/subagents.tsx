import type { SubagentActivity } from '@preload/index';
import { accordionContentMotion, accordionLayoutTransition } from '@renderer/shared/turn/sequence';
import { tw } from '@renderer/utils/tw';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'preact/hooks';

const statusLabel: Record<SubagentActivity['status'], string> = {
  failed: 'failed',
  queued: 'queued',
  running: 'working',
  cancelled: 'cancelled',
  completed: 'done'
};

const latestLog = (agent: SubagentActivity) => agent.logs.at(-1) ?? statusLabel[agent.status];

const statusText = (status: SubagentActivity['status']) => `[${statusLabel[status]}]`;

const statusClass = (status: SubagentActivity['status']) => {
  if (status === 'running') return 'text-hover';
  if (status === 'completed') return 'text-success';
  if (status === 'failed') return 'text-danger';
  return 'text-soft';
};

const SubagentLogs = ({ agent }: { agent: SubagentActivity }) => {
  const logs = agent.logs;
  if (logs.length === 0 && !agent.summary) return null;

  return (
    <div class="mt-2 space-y-1.5 pl-7 text-xs leading-5">
      <div class="flex list-none flex-col gap-1.5 p-0 text-soft">
        {logs.map((log, index) => (
          <p key={`${agent.id}:log:${index}`} class="m-0 [overflow-wrap:anywhere]">
            {log}
          </p>
        ))}
      </div>
      {agent.summary && (
        <div class="space-y-1.5 pt-1">
          <p class="m-0 text-sm leading-5 text-ink">{`From ${agent.name}`}</p>
          <p class="m-0 text-sm leading-6 text-soft [overflow-wrap:anywhere]">{agent.summary}</p>
        </div>
      )}
    </div>
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
        class="group/subagent flex w-full min-w-0 items-start gap-2 border-0 bg-transparent p-0 text-left outline-0 transition-colors hover:text-hover focus-visible:text-hover"
      >
        <img alt="" src={agent.avatar} class="mt-0.5 size-5 flex-none" />
        <span class="grid min-w-0 flex-1 gap-0.5">
          <span class="flex min-w-0 items-baseline gap-1.5 text-sm leading-5 text-soft">
            <span class="shrink-0 text-ink group-hover/subagent:text-hover group-focus-visible/subagent:text-hover">
              {agent.name}
            </span>
            <span class="shrink-0 text-soft">-</span>
            <span class="min-w-0 truncate text-soft">{agent.task}</span>
          </span>
          <span class={tw('truncate text-xs leading-4 capitalize', statusClass(agent.status))}>
            {`${statusText(agent.status)} ${latestLog(agent)}`}
          </span>
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div key="subagent-logs" {...accordionContentMotion} class="overflow-hidden">
            <SubagentLogs agent={agent} />
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
