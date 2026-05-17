import { CopyIcon } from '@renderer/ui/icons';
import { CommonTooltip } from '@renderer/ui/tooltip';
import { cn } from '@renderer/utils/cn';
import { formatMessageTime } from '@renderer/utils/time';
import type { ChatMessage } from '@renderer/utils/types';
import { useState } from 'preact/hooks';

const messageText = (message: ChatMessage) => {
  if (message.text) return message.text;
  if (message.role === 'terminal') return 'Running...';
  if (message.role === 'assistant') return message.activity ?? 'Thinking...';
  return '';
};

const EmptyMessages = ({ status }: { status: string }) => {
  return (
    <p class="m-0 grid min-h-full place-items-center text-center text-sm leading-6 text-soft opacity-0">{status}</p>
  );
};

const MessageActions = ({ message, visible }: { message: ChatMessage; visible: boolean }) => {
  if (message.role !== 'user' && message.role !== 'assistant' && message.role !== 'terminal') return null;
  if (!message.text) return null;

  return (
    <div
      class={cn(
        'mt-1.5 flex items-center gap-1 text-soft transition-opacity ease-in',
        visible ? 'opacity-100' : 'opacity-0',
        message.role === 'user' && 'flex-row-reverse justify-start self-end',
        message.role !== 'user' && 'justify-start self-start px-3.5'
      )}
    >
      <CommonTooltip label="Copy">
        <button
          type="button"
          aria-label="Copy message"
          onClick={() => void navigator.clipboard.writeText(message.text)}
          class="grid size-5 place-items-center rounded-md border-0 bg-transparent text-soft transition-[background-color,color] ease-in hover:bg-line hover:text-hover"
        >
          <CopyIcon class="size-3.5" />
        </button>
      </CommonTooltip>
      <time dateTime={new Date(message.createdAt).toISOString()} class="px-0.5 text-xs leading-none whitespace-nowrap">
        {formatMessageTime(message.createdAt)}
      </time>
    </div>
  );
};

const MessageArticle = ({ message }: { message: ChatMessage }) => {
  const [hovered, setHovered] = useState(false);
  const isAssistantActivity = message.role === 'assistant' && !message.text;

  return (
    <article
      key={message.id}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusIn={() => setHovered(true)}
      onFocusOut={() => setHovered(false)}
      class={cn(
        '[-webkit-app-region:no-drag] [&_*]:[-webkit-app-region:no-drag]',
        message.role === 'user' && 'flex w-fit max-w-[min(38rem,82%)] flex-col items-end self-end',
        message.role !== 'user' && 'max-w-[min(38rem,82%)] self-start',
        message.role === 'terminal' && 'w-full max-w-full',
        message.role === 'event' && 'self-center'
      )}
    >
      <div
        class={cn(
          'whitespace-pre-wrap rounded-[18px] text-sm leading-6 [overflow-wrap:anywhere]',
          message.role === 'user' && 'w-fit max-w-full rounded-br-md bg-composer px-4 py-2',
          message.role !== 'user' && 'py-2',
          message.role === 'event' && 'py-0.5 text-xs leading-none text-soft',
          message.role === 'system' && 'text-danger',
          message.role === 'terminal' && 'text-xs leading-5 text-ink',
          isAssistantActivity && 'text-soft'
        )}
      >
        {messageText(message)}
      </div>
      <MessageActions message={message} visible={hovered} />
    </article>
  );
};

const MessageContent = ({ status, messages }: { status: string; messages: ChatMessage[] }) => {
  if (messages.length === 0) return <EmptyMessages status={status} />;

  return messages.map((message) => <MessageArticle key={message.id} message={message} />);
};

export const Messages = ({ status, messages }: { status: string; messages: ChatMessage[] }) => {
  return (
    <section
      aria-live="polite"
      class="absolute inset-0 overflow-y-auto pt-9 pb-28 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <div class="mx-auto flex min-h-full max-w-3xl flex-col gap-3 px-5">
        <MessageContent status={status} messages={messages} />
      </div>
    </section>
  );
};
