import { TurnArticleById } from '@renderer/shared/turn/article';
import { estimateTurnHeight } from '@renderer/shared/turn/estimate';
import { turnActionTextAt } from '@renderer/shared/turn/sequence';
import { readTurn, turnIdsState } from '@renderer/state/chat';
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
      onRangeChange={onRangeChange}
      itemClassName="flex flex-col"
      estimateHeight={estimateTurnIdHeight}
      preserveScrollEnd={preserveScrollEnd}
      renderItem={(turnId, index) => {
        const assistant = readTurn(turnId)?.role === 'assistant';
        const actionText = assistant ? turnActionTextAt((i) => readTurn(turnIds[i] ?? ''), index) : '';
        return <TurnArticleById turnId={turnId} {...(actionText ? { actionText } : {})} />;
      }}
    />
  );
});
