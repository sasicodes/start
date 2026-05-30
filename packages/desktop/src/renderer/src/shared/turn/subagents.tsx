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
  return 'text-soft';
};

const SubagentLogs = ({ agent }: { agent: SubagentActivity }) => {
  const logs = agent.summary ? [...agent.logs, agent.summary] : agent.logs;
  if (logs.length === 0) return null;

  return (
    <div class="mt-2 space-y-1.5 pl-10 text-xs leading-5 text-soft">
      {logs.map((log, index) => (
        <p key={`${agent.id}:log:${index}`} class="m-0 [overflow-wrap:anywhere]">
          {log}
        </p>
      ))}
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
        class="group/subagent flex w-full min-w-0 items-center gap-2 rounded-md border border-line bg-transparent p-2 text-left outline-0 transition-colors hover:border-control hover:bg-control/40 focus-visible:border-control focus-visible:bg-control/40"
      >
        <img
          alt=""
          src={agent.avatar}
          class="size-8 flex-none rounded-md border border-line"
          style={{ borderColor: agent.accentColor }}
        />
        <span class="grid min-w-0 flex-1 gap-0.5">
          <span class="flex min-w-0 items-baseline gap-1.5 text-sm leading-5">
            <span class="shrink-0 text-ink">{agent.name}</span>
            <span class="shrink-0 text-soft">-</span>
            <span class="min-w-0 truncate text-soft">{agent.task}</span>
            <span class={tw('shrink-0 text-xs leading-4 capitalize', statusClass(agent.status))}>
              {statusText(agent.status)}
            </span>
          </span>
          <span class="truncate text-xs leading-4 text-soft">{latestLog(agent)}</span>
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
