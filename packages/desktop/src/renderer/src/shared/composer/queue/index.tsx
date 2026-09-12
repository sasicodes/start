import type { QueuedMessage } from '@preload/index';
import { Attached } from '@renderer/shared/composer/attached';
import { editingQueuedId } from '@renderer/shared/composer/queue/state';
import { queueAction } from '@renderer/shared/composer/queue/utils/action';
import { useReorder } from '@renderer/shared/composer/use-reorder';
import { visibleGoal } from '@renderer/shared/goal/state';
import { skillDisplayText } from '@renderer/shared/skill/parse';
import { DragIcon, TrashIcon } from '@renderer/ui/icons';
import { tw } from '@renderer/utils/tw';
import type { ComponentChildren } from 'preact';
import { useMemo } from 'preact/hooks';

interface QueueProps {
  children: ComponentChildren;
  messages: QueuedMessage[];
  visible: boolean;
  generating: boolean;
  onSteer: (id: string) => void;
  onSend: (id: string) => void;
  onDelete: (id: string) => void;
  onReorder: (orderedIds: string[]) => void;
}

export const Queue = ({
  messages,
  visible,
  children,
  generating,
  onDelete,
  onReorder,
  onSend,
  onSteer
}: QueueProps) => {
  const ids = useMemo(() => messages.map((message) => message.id), [messages]);
  const byId = useMemo(() => new Map(messages.map((message) => [message.id, message])), [messages]);
  const reorder = useReorder(ids, onReorder);
  const dragging = Boolean(reorder.dragId);
  const goalBlocked = generating || Boolean(visibleGoal.value);
  const firstGoalId = messages.find((message) => message.kind === 'goal')?.id ?? '';

  if (!visible) return null;

  return (
    <Attached contentClass="max-h-56 overflow-y-auto [&::-webkit-scrollbar]:hidden">
      {children}
      {messages.length > 0 && (
        <ul
          ref={reorder.listRef}
          aria-label="Queued messages"
          class={tw('m-0 flex list-none flex-col gap-1 p-0', dragging && 'select-none')}
        >
          {reorder.order.map((id) => {
            const message = byId.get(id);
            if (!message) return null;
            const editing = Boolean(message.editing || editingQueuedId.value === id);
            const text = skillDisplayText(message.text);
            const action = queueAction({
              editing,
              generating,
              kind: message.kind,
              blocked: goalBlocked || firstGoalId !== id
            });

            return (
              <li
                key={id}
                class={tw(
                  'group/queue relative flex min-w-0 items-center gap-1 rounded-xl py-2 pr-3 pl-1 transition-colors',
                  reorder.dragId === id
                    ? 'z-10 bg-control opacity-70 shadow-shell'
                    : !dragging && 'hover:bg-control focus-within:bg-control'
                )}
              >
                <span
                  aria-hidden="true"
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.currentTarget.setPointerCapture(event.pointerId);
                    reorder.start(id);
                  }}
                  class={tw(
                    'grid size-5 flex-none cursor-grab touch-none place-items-center text-soft transition-opacity active:cursor-grabbing [&_svg]:size-4',
                    dragging && reorder.dragId !== id && 'opacity-0'
                  )}
                >
                  <DragIcon />
                </span>
                <div class="min-w-0 flex-1 px-1">
                  <div class="flex min-w-0 items-center gap-1.5 text-sm leading-5 font-medium text-ink">
                    <span class="truncate">{text}</span>
                  </div>
                </div>
                <div
                  class={tw(
                    'flex flex-none items-center gap-1 transition-opacity',
                    dragging && reorder.dragId !== id && 'opacity-0'
                  )}
                >
                  <button
                    type="button"
                    disabled={action.disabled}
                    aria-label={action.label}
                    onClick={() => (action.steer ? onSteer(id) : onSend(id))}
                    class="rounded-full border-0 bg-transparent px-2 py-1 text-xs leading-none font-medium text-soft transition-colors hover:text-hover disabled:pointer-events-none disabled:text-hover"
                  >
                    {action.text}
                  </button>
                  <button
                    type="button"
                    aria-label="Delete queued message"
                    onClick={() => onDelete(id)}
                    class="grid size-6 place-items-center rounded-full border-0 bg-transparent p-0 text-soft transition-colors hover:text-danger [&_svg]:size-3.5"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Attached>
  );
};
