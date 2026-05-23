import { turnIdsState } from '@renderer/state/chat';
import { memo } from 'preact/compat';
import { useLayoutEffect, useMemo, useRef } from 'preact/hooks';
import { TurnArticleById } from '@renderer/shared/turn/article';

interface TurnsProps {
  activityPanelTurnId: string;
  onOpenActivityPanel: (turnId: string) => void;
}

const TurnContent = memo(({ activityPanelTurnId, onOpenActivityPanel }: TurnsProps) => {
  const turnIds = turnIdsState.value;

  if (turnIds.length === 0) return null;

  return turnIds.map((turnId) => (
    <TurnArticleById
      key={turnId}
      turnId={turnId}
      activityPanelOpen={turnId === activityPanelTurnId}
      onOpenActivityPanel={onOpenActivityPanel}
    />
  ));
});

export const Turns = memo(({ activityPanelTurnId, onOpenActivityPanel }: TurnsProps) => {
  const scrollRef = useRef<HTMLElement>(null);
  const turnIds = turnIdsState.value;
  const turnIdKey = useMemo(() => turnIds.join('|'), [turnIds]);

  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (!element || turnIds.length === 0) return;

    element.scrollTop = element.scrollHeight;
  }, [turnIdKey, turnIds.length]);

  return (
    <section
      ref={scrollRef}
      aria-live="polite"
      data-turn-scroll="true"
      class="absolute inset-0 overflow-y-auto pt-9 pb-28 [overflow-anchor:none] [&::-webkit-scrollbar]:hidden"
    >
      <div class="mx-auto flex min-h-full max-w-3xl flex-col justify-end gap-3 px-5">
        <TurnContent activityPanelTurnId={activityPanelTurnId} onOpenActivityPanel={onOpenActivityPanel} />
      </div>
    </section>
  );
});
