import type { QueuedMessage } from '@preload/index';
import { Attached } from '@renderer/shared/composer/attached';
import { TrashIcon } from '@renderer/ui/icons';

interface QueueProps {
  messages: QueuedMessage[];
  visible: boolean;
  onSteer: (id: string) => void;
  onDelete: (id: string) => void;
}

export const Queue = ({ messages, visible, onDelete, onSteer }: QueueProps) => {
  if (!visible || messages.length === 0) return null;

  return (
    <Attached contentClass="max-h-56 overflow-y-auto [&::-webkit-scrollbar]:hidden">
      <ul aria-label="Queued messages" class="m-0 flex list-none flex-col gap-1 p-0">
        {messages.map((message) => {
          const steering = message.kind === 'steer';

          return (
            <li
              key={message.id}
              class="group/queue flex min-w-0 items-center gap-2 rounded-xl bg-transparent px-3 py-2 transition-colors hover:bg-control focus-within:bg-control"
            >
              <div class="min-w-0 flex-1 px-1">
                <div class="truncate text-sm leading-5 font-medium text-ink">{message.text}</div>
              </div>
              <div class="flex flex-none items-center gap-1">
                <button
                  type="button"
                  disabled={steering}
                  aria-label={steering ? 'Already steering next' : 'Steer this queued message'}
                  onClick={() => onSteer(message.id)}
                  class="rounded-full border-0 bg-transparent px-2 py-1 text-xs leading-none font-medium text-soft transition-colors hover:text-hover disabled:pointer-events-none disabled:text-hover"
                >
                  {steering ? 'Steering' : 'Steer'}
                </button>
                <button
                  type="button"
                  aria-label="Delete queued message"
                  onClick={() => onDelete(message.id)}
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
