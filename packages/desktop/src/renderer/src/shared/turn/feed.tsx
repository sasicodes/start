import { TurnArticles } from '@renderer/shared/turn/articles';
import { useTurnRoom } from '@renderer/shared/turn/room';
import { scrollToBottomButtonState } from '@renderer/shared/turn/scroll';
import { turnIdsState } from '@renderer/state/chat';
import { tw } from '@renderer/utils/tw';
import { memo } from 'preact/compat';
import { useCallback, useEffect } from 'preact/hooks';

interface TurnFeedProps {
  activityPanelTurnId: string;
  onOpenActivityPanel: (turnId: string) => void;
}

const hasPageBelow = (element: HTMLElement) =>
  element.scrollHeight - element.clientHeight - element.scrollTop > element.clientHeight;

export const TurnFeed = memo(({ activityPanelTurnId, onOpenActivityPanel }: TurnFeedProps) => {
  const turnIds = turnIdsState.value;
  const { roomRef, scrollRef, contentRef, positioned, roomVisible } = useTurnRoom({ turnCount: turnIds.length });

  const syncLatestButton = useCallback(() => {
    const element = scrollRef.current;
    scrollToBottomButtonState.value = Boolean(element && hasPageBelow(element));
  }, [scrollRef]);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    element.addEventListener('scroll', syncLatestButton, { passive: true });
    syncLatestButton();
    return () => element.removeEventListener('scroll', syncLatestButton);
  }, [turnIds.length, scrollRef, syncLatestButton]);

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
