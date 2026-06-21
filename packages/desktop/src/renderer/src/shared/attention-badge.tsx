import type { AttentionState } from '@renderer/shared/attention-status';
import { tw } from '@renderer/utils/tw';

interface AttentionBadgeProps {
  countLabel: string;
  kind: AttentionState;
}

export const AttentionBadge = ({ kind, countLabel }: AttentionBadgeProps) => {
  if (!kind) return null;

  return (
    <span
      class={tw(
        'pointer-events-none absolute -top-0.5 -right-0.5 z-10 grid h-4.5 min-w-4.5 place-items-center rounded-full px-1 text-[10px] leading-none font-semibold text-white tabular-nums shadow-shell',
        kind === 'failed' && 'bg-danger',
        kind === 'completed' && 'bg-success',
        kind === 'generating' && 'bg-progress'
      )}
    >
      {countLabel}
    </span>
  );
};
