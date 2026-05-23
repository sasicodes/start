import { TurnArticleById } from '@renderer/shared/turn/article';
import { useTurnRoom } from '@renderer/shared/turn/room';
import { scrollSessionToBottom } from '@renderer/shared/turn/scroll';
import { turnIdsState } from '@renderer/state/chat';
import { ChevronDownIcon } from '@renderer/ui/icons';
import { Tooltip } from '@renderer/ui/tooltip';
import { tw } from '@renderer/utils/tw';
import { memo } from 'preact/compat';
import { useCallback, useEffect, useState } from 'preact/hooks';

interface TurnFeedProps {
  activityPanelTurnId: string;
  onOpenActivityPanel: (turnId: string) => void;
}

const hasPageBelow = (element: HTMLElement) =>
  element.scrollHeight - element.clientHeight - element.scrollTop > element.clientHeight;

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
  const [latestButtonVisible, setLatestButtonVisible] = useState(false);
  const { roomRef, scrollRef, contentRef, positioned, roomVisible } = useTurnRoom({ turnCount: turnIds.length });

  const syncLatestButton = useCallback(() => {
    const element = scrollRef.current;
    setLatestButtonVisible(Boolean(element && hasPageBelow(element)));
  }, [scrollRef]);

  const scrollToLatest = useCallback(() => {
    setLatestButtonVisible(false);
    scrollSessionToBottom();
  }, []);

  useEffect(() => {
    const element = scrollRef.current;
    const content = contentRef.current;
    if (!element || !content) return;

    const observer = new ResizeObserver(syncLatestButton);
    observer.observe(element);
    observer.observe(content);
    element.addEventListener('scroll', syncLatestButton, { passive: true });
    syncLatestButton();
    return () => {
      observer.disconnect();
      element.removeEventListener('scroll', syncLatestButton);
    };
  }, [scrollRef, contentRef, syncLatestButton]);

  return (
    <>
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
      {latestButtonVisible && (
        <div class="pointer-events-none absolute right-0 left-0 z-30 flex justify-center [bottom:calc(var(--main-composer-height,2.875rem)+1.25rem)]">
          <Tooltip label="Scroll to latest">
            <button
              type="button"
              onClick={scrollToLatest}
              aria-label="Scroll to latest"
              class="pointer-events-auto grid size-8 place-items-center rounded-full border border-line bg-composer text-soft shadow-shell transition-colors hover:bg-control hover:text-hover focus-visible:bg-control focus-visible:text-hover focus-visible:outline-0"
            >
              <ChevronDownIcon class="size-4" />
            </button>
          </Tooltip>
        </div>
      )}
    </>
  );
});
