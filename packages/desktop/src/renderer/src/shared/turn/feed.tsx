import { useComputed } from '@preact/signals';
import { TurnArticles } from '@renderer/shared/turn/articles';
import { useTurnRoom } from '@renderer/shared/turn/room';
import { useScrollToBottom } from '@renderer/shared/turn/use-scroll-to-bottom';
import { lastTurnStreaming, turnIdsState } from '@renderer/state/chat';
import type { VirtualHandle } from '@renderer/ui/virtual';
import { tw } from '@renderer/utils/tw';
import { memo } from 'preact/compat';
import { useCallback, useMemo, useRef } from 'preact/hooks';

export const TurnFeed = memo(() => {
  const turnIds = turnIdsState.value;
  const streaming = useComputed(lastTurnStreaming).value;
  const virtualRef = useRef<VirtualHandle | null>(null);
  const turnIndexes = useMemo(() => new Map(turnIds.map((turnId, index) => [turnId, index])), [turnIds]);
  const turnIndexesRef = useRef(turnIndexes);
  const turnIndex = useCallback((turnId: string) => turnIndexesRef.current.get(turnId) ?? -1, []);

  turnIndexesRef.current = turnIndexes;

  const { roomRef, scrollRef, contentRef, positioned, initialEnd, roomVisible, onVirtualRangeChange } = useTurnRoom({
    streaming,
    turnIndex,
    virtualRef,
    turnCount: turnIds.length
  });
  useScrollToBottom(scrollRef, contentRef);

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
      <div ref={contentRef} class="mx-auto flex min-h-full max-w-3xl flex-col justify-end px-5">
        <TurnArticles
          initialEnd={initialEnd}
          virtualRef={virtualRef}
          preserveScrollEnd={!roomVisible}
          onRangeChange={onVirtualRangeChange}
        />
        {roomVisible && <div ref={roomRef} class="shrink-0" aria-hidden="true" />}
      </div>
    </section>
  );
});
