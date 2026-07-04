import { Markdown } from '@renderer/markdown';
import { SkillMessage } from '@renderer/shared/skill/message';
import { parseSkillBlock } from '@renderer/shared/skill/parse';
import { TurnActivity } from '@renderer/shared/turn/activity';
import { turnSignal } from '@renderer/state/chat';
import { CopyButton } from '@renderer/ui/copy';
import { formatTurnTime } from '@renderer/utils/time';
import { tw } from '@renderer/utils/tw';
import type { Turn } from '@renderer/utils/types';
import { memo } from 'preact/compat';

const fallbackText = (turn: Turn) => {
  if (turn.text) return turn.text;
  if (turn.role === 'terminal') return 'Running...';
  return '';
};

const supplementOnlyRoles = new Set<Turn['role']>(['event', 'terminal', 'assistant']);

const hasSupplement = (turn: Turn) =>
  Boolean(turn.thinking) || Boolean(turn.details?.length) || Boolean(turn.activityItems?.length);

const shouldShowBody = (turn: Turn) => {
  if (turn.role === 'user') return Boolean(turn.text);
  return (
    Boolean(turn.text) || (turn.role !== 'assistant' && (!supplementOnlyRoles.has(turn.role) || !hasSupplement(turn)))
  );
};

const shouldUseMarkdown = (turn: Turn) => turn.role === 'assistant' && Boolean(turn.text);

const UserAttachments = memo(({ turn }: { turn: Turn }) => {
  const attachments = turn.attachments ?? [];
  if (turn.role !== 'user' || !attachments.length) return null;

  const visibleAttachments = attachments.slice(0, 4);
  const overflowCount = attachments.length - visibleAttachments.length;

  return (
    <div class="mb-1.5 flex max-w-full flex-wrap justify-end gap-1.5">
      {visibleAttachments.map((attachment) => (
        <img
          alt=""
          key={attachment.id}
          draggable={false}
          src={attachment.previewUrl}
          class="size-14 overflow-hidden rounded-lg border border-line bg-composer object-cover"
        />
      ))}
      {overflowCount > 0 && (
        <span class="grid size-14 place-items-center rounded-lg border border-line bg-composer text-xs leading-none font-semibold text-ink">
          +{overflowCount}
        </span>
      )}
    </div>
  );
});

const TurnActions = memo(({ actionText = '', turn }: { turn: Turn; actionText?: string }) => {
  if (turn.role !== 'user' && turn.role !== 'assistant' && turn.role !== 'terminal') return null;
  if (turn.role === 'assistant' && turn.streaming) return null;

  const text = turn.role === 'assistant' ? actionText : turn.text;
  if (!text) return null;

  return (
    <div
      class={tw(
        'mt-1.5 flex items-center gap-1 text-soft opacity-0 transition-opacity ease-in group-hover/turn:opacity-100 focus-within:opacity-100',
        turn.role === 'user' && 'flex-row-reverse justify-start self-end',
        turn.role !== 'user' && 'justify-start self-start'
      )}
    >
      <CopyButton
        text={text}
        ariaLabel="Copy turn"
        class="grid size-5 place-items-center rounded-md border-0 bg-transparent text-soft transition-colors ease-in hover:bg-line hover:text-hover"
      />
      <time dateTime={new Date(turn.createdAt).toISOString()} class="px-0.5 text-xs leading-none whitespace-nowrap">
        {formatTurnTime(turn.createdAt)}
      </time>
    </div>
  );
});

const TurnBody = memo(({ turn }: { turn: Turn }) => {
  if (!shouldShowBody(turn)) return null;

  const isUser = turn.role === 'user';
  const skillBlock = isUser ? parseSkillBlock(turn.text) : null;
  if (skillBlock) return <SkillMessage block={skillBlock} />;

  const isEvent = turn.role === 'event';
  const isSystem = turn.role === 'system';
  const useMarkdown = shouldUseMarkdown(turn);
  const isTerminal = turn.role === 'terminal';

  return (
    <div
      class={tw(
        'rounded-[18px] text-sm leading-6 [overflow-wrap:anywhere]',
        !useMarkdown && 'whitespace-pre-wrap',
        isUser && 'w-fit max-w-full rounded-br-md bg-composer px-4 py-2',
        !isUser && 'py-2',
        isEvent && 'py-0.5 text-xs leading-none text-soft',
        isSystem && 'text-danger',
        isTerminal && 'text-xs leading-5 text-ink'
      )}
    >
      {useMarkdown ? <Markdown source={turn.text} streaming={Boolean(turn.streaming)} /> : fallbackText(turn)}
    </div>
  );
});

interface TurnArticleProps {
  turn: Turn;
  actionText?: string;
}

interface TurnArticleByIdProps {
  turnId: string;
  actionText?: string;
}

export const TurnArticle = memo(({ actionText, turn }: TurnArticleProps) => {
  const details = turn.details ?? [];
  const items = turn.activityItems ?? [];
  const thinking = turn.thinking ?? '';
  const isUser = turn.role === 'user';
  const isEvent = turn.role === 'event';
  const activityWorking = turn.role === 'assistant' && Boolean(turn.streaming) && !turn.text;
  const fullWidth = turn.role === 'assistant' || hasSupplement(turn) || turn.role === 'terminal';

  return (
    <article
      data-turn-id={turn.id}
      class={tw(
        'group/turn [-webkit-app-region:no-drag]',
        isUser &&
          'flex w-fit max-w-[min(38rem,82%)] flex-col items-end self-end @max-chat-narrow/chat:w-full @max-chat-narrow/chat:max-w-full',
        !isUser && !fullWidth && 'max-w-[min(38rem,82%)] self-start',
        isEvent && !fullWidth && 'self-center',
        fullWidth && 'w-full max-w-full self-start'
      )}
    >
      <TurnActivity
        items={items}
        details={details}
        thinking={thinking}
        createdAt={turn.createdAt}
        working={activityWorking}
      />
      <UserAttachments turn={turn} />
      <TurnBody turn={turn} />
      <TurnActions turn={turn} {...(actionText ? { actionText } : {})} />
    </article>
  );
});

export const TurnArticleById = memo(({ actionText, turnId }: TurnArticleByIdProps) => {
  const signal = turnSignal(turnId);
  const turn = signal?.value;

  if (!turn) return null;

  return <TurnArticle turn={turn} {...(actionText ? { actionText } : {})} />;
});
