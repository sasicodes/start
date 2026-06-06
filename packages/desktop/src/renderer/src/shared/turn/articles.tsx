import { TurnArticleById } from '@renderer/shared/turn/article';
import { turnActionText } from '@renderer/shared/turn/sequence';
import { turnIdsState, turnSignal } from '@renderer/state/chat';
import type { Turn } from '@renderer/utils/types';
import { memo } from 'preact/compat';

const isTurn = (turn: Turn | null): turn is Turn => Boolean(turn);

export const TurnArticles = memo(() => {
  const turnIds = turnIdsState.value;

  if (turnIds.length === 0) return null;

  const turns = turnIds.map((turnId) => turnSignal(turnId)?.value ?? null).filter(isTurn);

  return turns.map((turn, index) => (
    <TurnArticleById key={turn.id} turnId={turn.id} actionText={turnActionText(turns, index)} />
  ));
});
