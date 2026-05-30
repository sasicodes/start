import { TurnArticleById } from '@renderer/shared/turn/article';
import { turnIdsState } from '@renderer/state/chat';
import { memo } from 'preact/compat';

export const TurnArticles = memo(() => {
  const turnIds = turnIdsState.value;

  if (turnIds.length === 0) return null;

  return turnIds.map((turnId) => <TurnArticleById key={turnId} turnId={turnId} />);
});
