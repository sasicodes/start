import type { QueuedMessage } from '@preload/index';
import { ComposerAttachedPanel } from '@renderer/shared/composer/attached-panel';
import { ArrowUpIcon } from '@renderer/ui/icons';
import { cn } from '@renderer/utils/cn';

interface QueuePanelProps {
  messages: QueuedMessage[];
  visible: boolean;
  onSteer: (id: string) => void;
}

const queueLabel = (kind: QueuedMessage['kind']) => (kind === 'steer' ? 'Steering next' : 'Queued follow-up');

export const QueuePanel = ({ messages, visible, onSteer }: QueuePanelProps) => {
  if (!visible || messages.length === 0) return null;

  return (
    <ComposerAttachedPanel contentClass="max-h-56 overflow-y-auto pb-2 [&::-webkit-scrollbar]:hidden">
      <div class="flex items-center justify-between gap-3 px-3 pt-2 pb-1">
        <span class="text-xs leading-4 font-medium text-soft">Queue</span>
        <span class="text-xs leading-4 text-soft tabular-nums">{messages.length}</span>
      </div>
      <ul aria-label="Queued messages" class="m-0 flex list-none flex-col gap-1 p-0">
        {messages.map((message) => {
          const steering = message.kind === 'steer';

          return (
            <li key={message.id} class="group/queue flex min-w-0 items-center gap-2 rounded-xl px-2 py-1.5">
              <div class="min-w-0 flex-1 px-1">
                <div class="truncate text-sm leading-5 font-medium text-ink">{message.text}</div>
                <div class={cn('mt-0.5 text-xs leading-4', steering ? 'text-hover' : 'text-soft')}>
                  {queueLabel(message.kind)}
                </div>
              </div>
              <button
                type="button"
                disabled={steering}
                aria-label={steering ? 'Already steering next' : 'Send this queued message next'}
                onClick={() => onSteer(message.id)}
                class="grid size-8.5 flex-none place-items-center rounded-full border-0 bg-control text-ink shadow-nav transition-opacity duration-100 ease-in hover:opacity-80 disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-3.5"
              >
                <ArrowUpIcon strokeWidth={2} />
              </button>
            </li>
          );
        })}
      </ul>
    </ComposerAttachedPanel>
  );
};
