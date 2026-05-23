import { TurnArticleById } from '@renderer/shared/turn/article';
import { turnIdsState } from '@renderer/state/chat';
import { memo } from 'preact/compat';

interface TurnArticlesProps {
  activityPanelTurnId: string;
  onOpenActivityPanel: (turnId: string) => void;
}

export const TurnArticles = memo(({ activityPanelTurnId, onOpenActivityPanel }: TurnArticlesProps) => {
  const turnIds = turnIdsState.value;

  if (turnIds.length === 0) return null;

  return turnIds.map((turnId) => (
    <TurnArticleById
      key={turnId}
      turnId={turnId}
      onOpenActivityPanel={onOpenActivityPanel}
      activityPanelOpen={turnId === activityPanelTurnId}
    />
  ));
});
