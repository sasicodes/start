import { Button } from '@base-ui/react/button';
import { goalEditor } from '@renderer/shared/goal/edit';
import { controlGoal, visibleGoal } from '@renderer/shared/goal/state';
import { GoalTime } from '@renderer/shared/goal/time';
import { GoalIcon, PauseIcon, PlayIcon, TrashIcon } from '@renderer/ui/icons';
import { Tooltip } from '@renderer/ui/tooltip';
import { tw } from '@renderer/utils/tw';
import type { ComponentChildren } from 'preact';

interface GoalControlProps {
  label: string;
  danger?: boolean;
  disabled: boolean;
  onClick: () => void;
  children: ComponentChildren;
}

const GoalControl = ({ label, danger = false, disabled, onClick, children }: GoalControlProps) => (
  <Tooltip label={label}>
    <Button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={tw(
        'relative grid size-6 place-items-center rounded-full border-0 bg-transparent p-0 text-soft transition-colors before:absolute before:-inset-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-3.5',
        danger ? 'hover:text-danger' : 'hover:text-hover'
      )}
    >
      {children}
    </Button>
  </Tooltip>
);

export const Goal = () => {
  const state = visibleGoal.value;
  const editor = goalEditor.value;
  if (!state) return null;
  const { goal } = state;
  const active = goal.status === 'active';
  const editingStatus = editor?.state.value.status ?? 'idle';
  const editing = editingStatus === 'editing' || editingStatus === 'saving';
  const saving = state.kind === 'saving' || editingStatus === 'starting';
  const detail = state.error;
  const toggleLabel = active ? 'Pause goal' : 'Resume goal';

  const toggle = () => controlGoal(active ? 'pause' : 'resume');
  const remove = () => {
    if (editor) editor.remove();
    else controlGoal('cancel');
  };

  return (
    <section class="group/goal grid gap-1 rounded-xl py-2 pr-3 pl-1" aria-label="Goal">
      <div class="flex min-w-0 items-center gap-1">
        <span class="grid size-5 shrink-0 place-items-center text-soft">
          <GoalIcon class="size-4" />
        </span>
        <span class="min-w-0 flex-1 truncate px-1 text-sm leading-5 font-medium text-ink" title={goal.objective}>
          {goal.objective}
        </span>
        <GoalTime goal={goal} />
        <div class="flex shrink-0 items-center gap-1" aria-busy={saving}>
          <GoalControl label={toggleLabel} disabled={saving || editing} onClick={toggle}>
            {active ? <PauseIcon /> : <PlayIcon />}
          </GoalControl>
          <GoalControl label="Delete goal" danger disabled={saving} onClick={remove}>
            <TrashIcon />
          </GoalControl>
        </div>
      </div>
      {detail && (
        <p class="m-0 truncate pl-7 text-xs text-soft" title={detail}>
          {detail}
        </p>
      )}
    </section>
  );
};
