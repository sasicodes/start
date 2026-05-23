import { TurnArticleById } from '@renderer/shared/turn/article';
import { useTurnRoom } from '@renderer/shared/turn/room';
import { turnIdsState } from '@renderer/state/chat';
import { tw } from '@renderer/utils/tw';
import { memo } from 'preact/compat';

interface TurnFeedProps {
  activityPanelTurnId: string;
  onOpenActivityPanel: (turnId: string) => void;
}

const TurnArticles = memo(({ activityPanelTurnId, onOpenActivityPanel }: TurnFeedProps) => {
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

export const TurnFeed = memo(({ activityPanelTurnId, onOpenActivityPanel }: TurnFeedProps) => {
  const turnIds = turnIdsState.value;
  const { roomRef, scrollRef, positioned, contentRef, roomVisible } = useTurnRoom({ turnCount: turnIds.length });

  return (
    <section
      ref={scrollRef}
      aria-live="polite"
      data-turn-scroll="true"
      class={tw(
        'absolute inset-0 overflow-y-auto pt-9 pb-28 [overflow-anchor:none] [&::-webkit-scrollbar]:hidden',
        !positioned && 'opacity-0'
      )}
    >
      <div ref={contentRef} class="mx-auto flex min-h-full max-w-3xl flex-col justify-end gap-3 px-5">
        <TurnArticles activityPanelTurnId={activityPanelTurnId} onOpenActivityPanel={onOpenActivityPanel} />
        {roomVisible && <div ref={roomRef} class="shrink-0" aria-hidden="true" />}
      </div>
    </section>
  );
});
