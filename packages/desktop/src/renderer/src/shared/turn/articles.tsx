import { TurnArticleById } from '@renderer/shared/turn/article';
import { estimateTurnHeight } from '@renderer/shared/turn/estimate';
import { turnActionTextAt } from '@renderer/shared/turn/sequence';
import { readTurn, turnIdsState } from '@renderer/state/chat';
import { Virtual, type VirtualHandle } from '@renderer/ui/virtual';
import type { RefObject } from 'preact';
import { memo } from 'preact/compat';

interface TurnArticlesProps {
  initialEnd: boolean;
  onRangeChange: () => void;
  preserveScrollEnd: boolean;
  virtualRef: RefObject<VirtualHandle | null>;
}

const turnKey = (turnId: string) => turnId;

const estimateTurnIdHeight = (turnId: string) => {
  const turn = readTurn(turnId);
  return turn ? estimateTurnHeight(turn) : 44;
};

export const TurnArticles = memo(({ initialEnd, onRangeChange, preserveScrollEnd, virtualRef }: TurnArticlesProps) => {
  const turnIds = turnIdsState.value;

  if (!turnIds.length) return null;

  return (
    <Virtual
      gap={12}
      items={turnIds}
      getKey={turnKey}
      className="w-full"
      apiRef={virtualRef}
      initialEnd={initialEnd}
      onRangeChange={onRangeChange}
      itemClassName="flex flex-col"
      renderItem={(turnId, index) => {
        const assistant = readTurn(turnId)?.role === 'assistant';
        const actionText = assistant ? turnActionTextAt((i) => readTurn(turnIds[i] ?? ''), index) : '';
        return <TurnArticleById turnId={turnId} {...(actionText ? { actionText } : {})} />;
      }}
      estimateHeight={estimateTurnIdHeight}
      preserveScrollEnd={preserveScrollEnd}
    />
  );
});
