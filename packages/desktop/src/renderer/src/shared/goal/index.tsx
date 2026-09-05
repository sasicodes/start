import { Button } from '@base-ui/react/button';
import type { GoalAction } from '@preload/index';
import { controlGoal, visibleGoal } from '@renderer/shared/goal/state';

interface GoalControlProps {
  action: GoalAction;
  disabled: boolean;
}

const labels = { pause: 'Pause', resume: 'Resume', cancel: 'Cancel' };

const GoalControl = ({ action, disabled }: GoalControlProps) => (
  <Button
    disabled={disabled}
    onClick={() => controlGoal(action)}
    className="shrink-0 rounded-md border-0 bg-transparent px-2 py-1 text-xs text-soft outline-0 hover:text-ink focus-visible:text-ink disabled:opacity-50"
  >
    {labels[action]}
  </Button>
);

export const Goal = () => {
  const state = visibleGoal.value;
  if (!state) return null;
  const { goal } = state;
  const active = goal.status === 'active';
  const saving = state.kind === 'saving';
  const detail = state.error || goal.reason || '';

  return (
    <section class="grid gap-1 rounded-xl px-3 py-2 text-xs" aria-label="Goal">
      <div class="flex min-w-0 items-center gap-2">
        <span class="shrink-0 text-soft">Goal</span>
        <span class="min-w-0 flex-1 truncate text-ink" title={goal.objective}>
          {goal.objective}
        </span>
        <span class="shrink-0 text-soft capitalize">{goal.status}</span>
        <div class="flex shrink-0 items-center" aria-busy={saving}>
          <GoalControl action={active ? 'pause' : 'resume'} disabled={saving} />
          <GoalControl action="cancel" disabled={saving} />
        </div>
      </div>
      {detail && (
        <p class="m-0 truncate text-soft" title={detail}>
          {detail}
        </p>
      )}
    </section>
  );
};
