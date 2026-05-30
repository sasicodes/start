import { TurnArticles } from '@renderer/shared/turn/articles';
import { useTurnRoom } from '@renderer/shared/turn/room';
import { useScrollToBottom } from '@renderer/shared/turn/use-scroll-to-bottom';
import { turnIdsState } from '@renderer/state/chat';
import { tw } from '@renderer/utils/tw';
import { memo } from 'preact/compat';

export const TurnFeed = memo(() => {
  const turnIds = turnIdsState.value;
  const { roomRef, scrollRef, contentRef, positioned, roomVisible } = useTurnRoom({ turnCount: turnIds.length });
  useScrollToBottom(scrollRef, turnIds.length);

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
        <TurnArticles />
        {roomVisible && <div ref={roomRef} class="shrink-0" aria-hidden="true" />}
      </div>
    </section>
  );
});
