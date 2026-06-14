import { TurnArticleById } from '@renderer/shared/turn/article';
import { estimateTurnHeight } from '@renderer/shared/turn/estimate';
import { turnActionText } from '@renderer/shared/turn/sequence';
import { turnIdsState, turnSignal } from '@renderer/state/chat';
import { Virtual, type VirtualHandle } from '@renderer/ui/virtual';
import type { Turn } from '@renderer/utils/types';
import type { RefObject } from 'preact';
import { memo } from 'preact/compat';

interface TurnArticlesProps {
  onRangeChange: () => void;
  preserveScrollEnd: boolean;
  virtualRef: RefObject<VirtualHandle | null>;
}

const isTurn = (turn: Turn | null): turn is Turn => Boolean(turn);

const turnKey = (turn: Turn) => turn.id;

export const TurnArticles = memo(({ virtualRef, onRangeChange, preserveScrollEnd }: TurnArticlesProps) => {
  const turnIds = turnIdsState.value;
  const turns = turnIds.map((turnId) => turnSignal(turnId)?.value ?? null).filter(isTurn);

  if (!turns.length) return null;

  return (
    <Virtual
      gap={12}
      items={turns}
      getKey={turnKey}
      className="w-full"
      apiRef={virtualRef}
      estimateHeightAsMinimum
      onRangeChange={onRangeChange}
      itemClassName="flex flex-col"
      estimateHeight={estimateTurnHeight}
      preserveScrollEnd={preserveScrollEnd}
      renderItem={(turn, index) => <TurnArticleById turnId={turn.id} actionText={turnActionText(turns, index)} />}
    />
  );
});
