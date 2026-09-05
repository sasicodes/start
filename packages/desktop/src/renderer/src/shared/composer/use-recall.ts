import { createMessageRecall } from '@renderer/shared/composer/recall';
import { useEffect, useRef } from 'preact/hooks';

export const useMessageRecall = (
  entries: string[],
  queuedIds: string[],
  draft: string,
  onDraftChange: (value: string) => void
) => {
  const context = useRef({ entries, queuedIds, draft, onDraftChange });
  context.current = { entries, queuedIds, draft, onDraftChange };
  const recall = useRef<ReturnType<typeof createMessageRecall> | null>(null);
  recall.current ??= createMessageRecall(() => context.current);
  const controller = recall.current;

  useEffect(() => controller.dispose, [controller]);

  return controller;
};
