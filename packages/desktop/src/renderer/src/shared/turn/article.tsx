import { Markdown } from '@renderer/markdown';
import { TurnDetails } from '@renderer/shared/turn/details';
import { turnSignal } from '@renderer/state/chat';
import { CopyButton } from '@renderer/ui/copy';
import { tw } from '@renderer/utils/tw';
import { formatTurnTime } from '@renderer/utils/time';
import type { Turn } from '@renderer/utils/types';
import { memo } from 'preact/compat';
import { useCallback } from 'preact/hooks';

const fallbackText = (turn: Turn) => {
  if (turn.text) return turn.text;
  if (turn.role === 'terminal') return 'Running...';
  return '';
};

const supplementOnlyRoles = new Set<Turn['role']>(['event', 'terminal', 'assistant']);

const hasSupplement = (turn: Turn) => Boolean(turn.thinking) || Boolean(turn.details?.length);

const shouldShowBody = (turn: Turn) =>
  Boolean(turn.text) || (turn.role !== 'assistant' && (!supplementOnlyRoles.has(turn.role) || !hasSupplement(turn)));

const shouldUseMarkdown = (turn: Turn) => turn.role === 'assistant' && Boolean(turn.text);

const TurnActions = memo(({ turn }: { turn: Turn }) => {
  if (turn.role !== 'user' && turn.role !== 'assistant' && turn.role !== 'terminal') return null;
  if (turn.role === 'assistant' && turn.streaming) return null;
  if (!turn.text) return null;

  return (
    <div
      class={tw(
        'mt-1.5 flex items-center gap-1 text-soft opacity-0 transition-opacity ease-in group-hover/turn:opacity-100 group-focus-within/turn:opacity-100',
        turn.role === 'user' && 'flex-row-reverse justify-start self-end',
        turn.role !== 'user' && 'justify-start self-start'
      )}
    >
      <CopyButton
        ariaLabel="Copy turn"
        text={turn.text}
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
  activityPanelOpen: boolean;
  turn: Turn;
  onOpenActivityPanel: (turnId: string) => void;
}

interface TurnArticleByIdProps extends Omit<TurnArticleProps, 'turn'> {
  turnId: string;
}

export const TurnArticle = memo(({ activityPanelOpen, onOpenActivityPanel, turn }: TurnArticleProps) => {
  const details = turn.details ?? [];
  const thinking = turn.thinking ?? '';
  const isUser = turn.role === 'user';
  const isEvent = turn.role === 'event';
  const activityWorking = turn.role === 'assistant' && Boolean(turn.streaming) && !turn.text;
  const fullWidth = turn.role === 'assistant' || hasSupplement(turn) || turn.role === 'terminal';
  const openActivityPanel = useCallback(() => onOpenActivityPanel(turn.id), [onOpenActivityPanel, turn.id]);

  return (
    <article
      data-turn-id={turn.id}
      class={tw(
        'group/turn [-webkit-app-region:no-drag] [&_*]:[-webkit-app-region:no-drag]',
        isUser &&
          'flex w-fit max-w-[min(38rem,82%)] flex-col items-end self-end @max-chat-narrow/chat:w-full @max-chat-narrow/chat:max-w-full',
        !isUser && !fullWidth && 'max-w-[min(38rem,82%)] self-start',
        isEvent && !fullWidth && 'self-center',
        fullWidth && 'w-full max-w-full self-start'
      )}
    >
      <TurnDetails
        createdAt={turn.createdAt}
        details={details}
        panelOpen={activityPanelOpen}
        thinking={thinking}
        working={activityWorking}
        onOpenPanel={openActivityPanel}
      />
      <TurnBody turn={turn} />
      <TurnActions turn={turn} />
    </article>
  );
});

export const TurnArticleById = memo(({ activityPanelOpen, onOpenActivityPanel, turnId }: TurnArticleByIdProps) => {
  const signal = turnSignal(turnId);
  const turn = signal?.value;

  if (!turn) return null;

  return <TurnArticle turn={turn} activityPanelOpen={activityPanelOpen} onOpenActivityPanel={onOpenActivityPanel} />;
});
