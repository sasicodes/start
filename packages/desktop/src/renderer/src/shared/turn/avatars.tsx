import type { SubagentActivity } from '@preload/index';

interface SubagentAvatarsProps {
  agents: SubagentActivity[];
}

const visibleAgents = (agents: SubagentActivity[]) => agents.slice(0, 5);

export const SubagentAvatars = ({ agents }: SubagentAvatarsProps) => {
  const visible = visibleAgents(agents);
  if (visible.length === 0) return null;

  return (
    <span class="-space-x-1.5 inline-flex shrink-0 items-center" aria-hidden="true">
      {visible.map((agent) => (
        <img alt="" key={agent.id} src={agent.avatar} class="size-4 rounded-full border border-canvas bg-canvas" />
      ))}
    </span>
  );
};
