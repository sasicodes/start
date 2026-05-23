import { TurnArticleById } from '@renderer/shared/turn/article';
import { turnScrollIntentState } from '@renderer/shared/turn/scroll';
import { turnIdsState } from '@renderer/state/chat';
import { memo } from 'preact/compat';
import { useLayoutEffect, useRef, useState } from 'preact/hooks';

interface TurnFeedProps {
  activityPanelTurnId: string;
  onOpenActivityPanel: (turnId: string) => void;
}

const scrollToBottom = (element: HTMLElement) => {
  element.scrollTop = element.scrollHeight;
};

const scrollToTurnStart = (element: HTMLElement, turnId: string) => {
  const target = Array.from(element.querySelectorAll<HTMLElement>('[data-turn-id]')).find(
    (node) => node.dataset.turnId === turnId
  );
  if (!target) return;

  const topInset = Number.parseFloat(getComputedStyle(element).paddingTop) || 0;
  const elementTop = element.getBoundingClientRect().top;
  const targetTop = target.getBoundingClientRect().top;
  element.scrollTop += targetTop - elementTop - topInset;
};

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
  const scrollRef = useRef<HTMLElement>(null);
  const turnIds = turnIdsState.value;
  const scrollIntent = turnScrollIntentState.value;
  const [roomTurnId, setRoomTurnId] = useState('');

  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (!element || turnIds.length === 0) {
      setRoomTurnId('');
      return;
    }

    if (scrollIntent.kind === 'bottom') {
      setRoomTurnId('');
      const frame = requestAnimationFrame(() => scrollToBottom(element));
      return () => cancelAnimationFrame(frame);
    }

    setRoomTurnId(scrollIntent.turnId);
    const frame = requestAnimationFrame(() => scrollToTurnStart(element, scrollIntent.turnId));
    return () => cancelAnimationFrame(frame);
  }, [scrollIntent, turnIds.length]);

  return (
    <section
      ref={scrollRef}
      aria-live="polite"
      data-turn-scroll="true"
      class="absolute inset-0 overflow-y-auto pt-9 pb-28 [overflow-anchor:none] [&::-webkit-scrollbar]:hidden"
    >
      <div class="mx-auto flex min-h-full max-w-3xl flex-col justify-end gap-3 px-5">
        <TurnArticles activityPanelTurnId={activityPanelTurnId} onOpenActivityPanel={onOpenActivityPanel} />
        {roomTurnId && <div aria-hidden="true" class="min-h-screen shrink-0" />}
      </div>
    </section>
  );
});
