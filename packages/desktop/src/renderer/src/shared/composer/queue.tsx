import type { QueuedMessage } from '@preload/index';
import { Attached } from '@renderer/shared/composer/attached';
import { useReorder } from '@renderer/shared/composer/use-reorder';
import { skillDisplayText } from '@renderer/shared/skill/parse';
import { DragIcon, TrashIcon } from '@renderer/ui/icons';
import { tw } from '@renderer/utils/tw';
import { useMemo } from 'preact/hooks';

interface QueueProps {
  messages: QueuedMessage[];
  visible: boolean;
  onSteer: (id: string) => void;
  onDelete: (id: string) => void;
  onReorder: (orderedIds: string[]) => void;
}

export const Queue = ({ messages, visible, onDelete, onReorder, onSteer }: QueueProps) => {
  const ids = useMemo(() => messages.map((message) => message.id), [messages]);
  const byId = useMemo(() => new Map(messages.map((message) => [message.id, message])), [messages]);
  const reorder = useReorder(ids, onReorder);

  if (!visible || messages.length === 0) return null;

  return (
    <Attached contentClass="max-h-56 overflow-y-auto [&::-webkit-scrollbar]:hidden">
      <ul aria-label="Queued messages" class="m-0 flex list-none flex-col gap-1 p-0">
        {reorder.order.map((id) => {
          const message = byId.get(id);
          if (!message) return null;
          const steering = message.kind === 'steer';
          const text = skillDisplayText(message.text);

          return (
            <li
              key={id}
              draggable
              onDragStart={() => reorder.start(id)}
              onDragEnter={() => reorder.enter(id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={reorder.drop}
              onDragEnd={reorder.drop}
              class={tw(
                'group/queue flex min-w-0 items-center gap-1 rounded-xl bg-transparent py-2 pr-3 pl-1 transition-colors hover:bg-control focus-within:bg-control',
                reorder.dragId === id && 'opacity-50'
              )}
            >
              <span
                aria-hidden="true"
                class="grid size-5 flex-none cursor-grab place-items-center text-soft active:cursor-grabbing [&_svg]:size-4"
              >
                <DragIcon />
              </span>
              <div class="min-w-0 flex-1 px-1">
                <div class="flex min-w-0 items-center gap-1.5 text-sm leading-5 font-medium text-ink">
                  <span class="truncate">{text}</span>
                </div>
              </div>
              <div class="flex flex-none items-center gap-1">
                <button
                  type="button"
                  disabled={steering}
                  aria-label={steering ? 'Already steering next' : 'Steer this queued message'}
                  onClick={() => onSteer(id)}
                  class="rounded-full border-0 bg-transparent px-2 py-1 text-xs leading-none font-medium text-soft transition-colors hover:text-hover disabled:pointer-events-none disabled:text-hover"
                >
                  {steering ? 'Steering' : 'Steer'}
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
    </Attached>
  );
};
