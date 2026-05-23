import { TurnArticle } from '@renderer/shared/turn/article';
import type { Turn } from '@renderer/utils/types';
import { useLayoutEffect, useMemo, useRef } from 'preact/hooks';

type TurnContentProps = {
  turns: Turn[];
  activityPanelTurnId: string;
  onOpenActivityPanel: (turnId: string) => void;
};

type TurnsProps = TurnContentProps;

const detailKey = (turn: Turn) => {
  return (turn.details ?? [])
    .map((detail) => `${detail.id}:${detail.count}:${detail.updatedAt}:${detail.body?.length ?? 0}`)
    .join(',');
};

const turnKey = (turn: Turn) => {
  return [turn.id, turn.text.length, turn.thinking?.length ?? 0, detailKey(turn)].join(':');
};

const TurnContent = ({ turns, activityPanelTurnId, onOpenActivityPanel }: TurnContentProps) => {
  if (turns.length === 0) return null;

  return turns.map((turn) => (
    <TurnArticle
      key={turn.id}
      turn={turn}
      activityPanelOpen={turn.id === activityPanelTurnId}
      onOpenActivityPanel={onOpenActivityPanel}
    />
  ));
};

export const Turns = ({ turns, activityPanelTurnId, onOpenActivityPanel }: TurnsProps) => {
  const scrollRef = useRef<HTMLElement>(null);
  const turnPositionKey = useMemo(() => turns.map(turnKey).join('|'), [turns]);

  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (!element || turns.length === 0) return;

    element.scrollTop = element.scrollHeight;
  }, [turnPositionKey, turns.length]);

  return (
    <section
      ref={scrollRef}
      aria-live="polite"
      class="absolute inset-0 overflow-y-auto pt-9 pb-28 [-ms-overflow-style:none] [overflow-anchor:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <div class="mx-auto flex min-h-full max-w-3xl flex-col justify-end gap-3 px-5">
        <TurnContent
          turns={turns}
          activityPanelTurnId={activityPanelTurnId}
          onOpenActivityPanel={onOpenActivityPanel}
        />
      </div>
    </section>
  );
};
