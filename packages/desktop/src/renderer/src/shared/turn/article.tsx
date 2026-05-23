import { Markdown } from '@renderer/markdown';
import { TurnDetails } from '@renderer/shared/turn/details';
import { CopyButton } from '@renderer/ui/copy';
import { cn } from '@renderer/utils/cn';
import { formatTurnTime } from '@renderer/utils/time';
import type { Turn } from '@renderer/utils/types';
import { useState } from 'preact/hooks';

const fallbackText = (turn: Turn) => {
  if (turn.text) return turn.text;
  if (turn.role === 'terminal') return 'Running...';
  if (turn.role === 'assistant') return turn.activity ?? 'Thinking...';
  return '';
};

const supplementOnlyRoles = new Set<Turn['role']>(['event', 'terminal', 'assistant']);

const hasSupplement = (turn: Turn) => Boolean(turn.thinking) || Boolean(turn.details?.length);

const shouldShowBody = (turn: Turn) =>
  Boolean(turn.text) || !supplementOnlyRoles.has(turn.role) || !hasSupplement(turn);

const shouldUseMarkdown = (turn: Turn) => turn.role === 'assistant' && Boolean(turn.text) && !turn.streaming;

const TurnActions = ({ turn, visible }: { turn: Turn; visible: boolean }) => {
  if (turn.role !== 'user' && turn.role !== 'assistant' && turn.role !== 'terminal') return null;
  if (!turn.text) return null;

  return (
    <div
      class={cn(
        'mt-1.5 flex items-center gap-1 text-soft transition-opacity ease-in',
        visible ? 'opacity-100' : 'opacity-0',
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
};

const TurnBody = ({ turn }: { turn: Turn }) => {
  if (!shouldShowBody(turn)) return null;

  const isUser = turn.role === 'user';
  const isEvent = turn.role === 'event';
  const isSystem = turn.role === 'system';
  const useMarkdown = shouldUseMarkdown(turn);
  const isTerminal = turn.role === 'terminal';
  const isAssistantActivity = turn.role === 'assistant' && !turn.text;

  return (
    <div
      class={cn(
        'rounded-[18px] text-sm leading-6 [overflow-wrap:anywhere]',
        !useMarkdown && 'whitespace-pre-wrap',
        isUser && 'w-fit max-w-full rounded-br-md bg-composer px-4 py-2',
        !isUser && 'py-2',
        isEvent && 'py-0.5 text-xs leading-none text-soft',
        isSystem && 'text-danger',
        isTerminal && 'text-xs leading-5 text-ink',
        isAssistantActivity && 'text-soft'
      )}
    >
      {useMarkdown ? <Markdown source={turn.text} /> : fallbackText(turn)}
    </div>
  );
};

type TurnArticleProps = {
  activityPanelOpen: boolean;
  turn: Turn;
  onOpenActivityPanel: (turnId: string) => void;
};

export const TurnArticle = ({ activityPanelOpen, onOpenActivityPanel, turn }: TurnArticleProps) => {
  const [hovered, setHovered] = useState(false);
  const details = turn.details ?? [];
  const thinking = turn.thinking ?? '';
  const isUser = turn.role === 'user';
  const isEvent = turn.role === 'event';
  const wide = hasSupplement(turn) || turn.role === 'terminal';

  return (
    <article
      onFocusIn={() => setHovered(true)}
      onFocusOut={() => setHovered(false)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      class={cn(
        '[-webkit-app-region:no-drag] [&_*]:[-webkit-app-region:no-drag]',
        isUser && 'flex w-fit max-w-[min(38rem,82%)] flex-col items-end self-end',
        !isUser && 'max-w-[min(38rem,82%)] self-start',
        isEvent && !wide && 'self-center',
        wide && 'w-full max-w-full'
      )}
    >
      <TurnDetails
        createdAt={turn.createdAt}
        details={details}
        panelOpen={activityPanelOpen}
        streaming={Boolean(turn.streaming)}
        thinking={thinking}
        onOpenPanel={() => onOpenActivityPanel(turn.id)}
      />
      <TurnBody turn={turn} />
      <TurnActions turn={turn} visible={hovered} />
    </article>
  );
};
