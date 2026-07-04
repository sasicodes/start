import { useComputed } from '@preact/signals';
import { composerHeight } from '@renderer/shared/composer/state';
import { TurnArticles } from '@renderer/shared/turn/articles';
import { useTurnRoom } from '@renderer/shared/turn/room';
import { useScrollToBottom } from '@renderer/shared/turn/use-scroll-to-bottom';
import { lastTurnStreaming, turnIdsState } from '@renderer/state/chat';
import type { VirtualHandle } from '@renderer/ui/virtual';
import { tw } from '@renderer/utils/tw';
import { memo } from 'preact/compat';
import { useCallback, useMemo, useRef } from 'preact/hooks';

const composerFeedClearance = 34;
const defaultFeedPaddingBottom = 112;

export const TurnFeed = memo(() => {
  const turnIds = turnIdsState.value;
  const streaming = useComputed(lastTurnStreaming).value;
  const virtualRef = useRef<VirtualHandle | null>(null);
  const turnIndexes = useMemo(() => new Map(turnIds.map((turnId, index) => [turnId, index])), [turnIds]);
  const turnIndexesRef = useRef(turnIndexes);
  const turnIndex = useCallback((turnId: string) => turnIndexesRef.current.get(turnId) ?? -1, []);

  turnIndexesRef.current = turnIndexes;

  const { roomRef, scrollRef, contentRef, positioned, roomVisible, onVirtualRangeChange } = useTurnRoom({
    streaming,
    turnIndex,
    virtualRef,
    turnCount: turnIds.length
  });
  useScrollToBottom(scrollRef, contentRef);

  const measuredComposerHeight = composerHeight.value;
  const paddingBottom = measuredComposerHeight
    ? measuredComposerHeight + composerFeedClearance
    : defaultFeedPaddingBottom;

  return (
    <section
      ref={scrollRef}
      aria-live="polite"
      data-turn-scroll="true"
      class={tw(
        'absolute inset-0 overflow-y-auto pt-9 [overflow-anchor:none] [&::-webkit-scrollbar]:hidden',
        !positioned && 'opacity-0'
      )}
    >
      <div
        ref={contentRef}
        style={{ paddingBottom }}
        class="mx-auto flex min-h-full max-w-3xl flex-col justify-end px-5"
      >
        <TurnArticles virtualRef={virtualRef} preserveScrollEnd={!roomVisible} onRangeChange={onVirtualRangeChange} />
        {roomVisible && <div ref={roomRef} class="shrink-0" aria-hidden="true" />}
      </div>
    </section>
  );
});
