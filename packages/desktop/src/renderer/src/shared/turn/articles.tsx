import { TurnArticleById } from '@renderer/shared/turn/article';
import { estimateTurnHeight } from '@renderer/shared/turn/estimate';
import { turnActionText } from '@renderer/shared/turn/sequence';
import { readTurn, readTurns, turnIdsState } from '@renderer/state/chat';
import { Virtual, type VirtualHandle } from '@renderer/ui/virtual';
import type { RefObject } from 'preact';
import { memo } from 'preact/compat';

interface TurnArticlesProps {
  onRangeChange: () => void;
  preserveScrollEnd: boolean;
  virtualRef: RefObject<VirtualHandle | null>;
}

const turnKey = (turnId: string) => turnId;

const estimateTurnIdHeight = (turnId: string) => {
  const turn = readTurn(turnId);
  return turn ? estimateTurnHeight(turn) : 44;
};

export const TurnArticles = memo(({ virtualRef, onRangeChange, preserveScrollEnd }: TurnArticlesProps) => {
  const turnIds = turnIdsState.value;

  if (!turnIds.length) return null;

  return (
    <Virtual
      gap={12}
      items={turnIds}
      getKey={turnKey}
      className="w-full"
      apiRef={virtualRef}
      estimateHeightAsMinimum
      onRangeChange={onRangeChange}
      itemClassName="flex flex-col"
      estimateHeight={estimateTurnIdHeight}
      preserveScrollEnd={preserveScrollEnd}
      renderItem={(turnId, index) => (
        <TurnArticleById turnId={turnId} actionText={() => turnActionText(readTurns(), index)} />
      )}
    />
  );
});
