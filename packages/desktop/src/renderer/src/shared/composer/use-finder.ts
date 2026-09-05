import { type FinderItem, finderItemKey } from '@renderer/shared/finder';
import { useFinderItems } from '@renderer/shared/finder/use-items';
import { activeFinderToken, activeSlashCommandToken, finderTokenPrefix } from '@renderer/shared/input';
import { useSlashCommandItems } from '@renderer/shared/slash-commands';
import { useCallback, useMemo, useState } from 'preact/hooks';

interface FinderSelection {
  index: number;
  query: string;
  items: FinderItem[];
}

export const useComposerFinder = (draft: string, onDraftChange: (value: string) => void) => {
  const [finderSelection, setFinderSelection] = useState<FinderSelection>(() => ({ index: 0, items: [], query: '' }));

  const finderToken = useMemo(() => activeFinderToken(draft), [draft]);
  const slashCommandToken = useMemo(() => activeSlashCommandToken(draft), [draft]);
  const fileItems: FinderItem[] = useFinderItems(finderToken);
  const commandItems: FinderItem[] = useSlashCommandItems(slashCommandToken);
  const finderItems: FinderItem[] = slashCommandToken ? commandItems : fileItems;
  const finderQuery = (slashCommandToken?.query ?? finderToken?.query ?? '').trim().toLowerCase();
  const finderStart = slashCommandToken?.start ?? finderToken?.start ?? 0;
  const finderVisible = Boolean(finderToken || slashCommandToken);
  const defaultFinderIndex = useMemo(() => {
    const exactIndex = finderItems.findIndex((item) => item.name.toLowerCase() === finderQuery);
    return Math.max(exactIndex, 0);
  }, [finderItems, finderQuery]);
  const activeFinderIndex =
    finderSelection.items === finderItems && finderSelection.query === finderQuery
      ? finderSelection.index
      : defaultFinderIndex;
  const selectedFinderItem = finderItems[activeFinderIndex] ?? finderItems[0];
  const selectedFinderKey = selectedFinderItem ? finderItemKey(selectedFinderItem) : '';

  const moveFinderSelection = useCallback(
    (delta: number) => {
      setFinderSelection((current) => {
        const baseIndex =
          current.items === finderItems && current.query === finderQuery ? current.index : defaultFinderIndex;
        return {
          query: finderQuery,
          items: finderItems,
          index: Math.min(Math.max(baseIndex + delta, 0), finderItems.length - 1)
        };
      });
    },
    [defaultFinderIndex, finderItems, finderQuery]
  );

  const completeFinderItem = (item: FinderItem, enterDirectory: boolean) => {
    if (slashCommandToken) {
      if (item.type !== 'command') return;
      onDraftChange(`${draft.slice(0, slashCommandToken.start)}/${item.name} `);
      return;
    }

    if (!finderToken || item.type === 'command') return;
    if (item.type === 'browser' || item.type === 'new-session') {
      onDraftChange(`${draft.slice(0, finderToken.start)}${finderTokenPrefix(finderToken.marker)}${item.name} `);
      return;
    }

    const suffix = item.type === 'directory' && enterDirectory ? '/' : ' ';
    const nextToken = `${finderTokenPrefix(finderToken.marker)}${item.path}${suffix}`;
    onDraftChange(`${draft.slice(0, finderToken.start)}${nextToken}`);
  };

  return {
    finderToken,
    finderItems,
    finderStart,
    finderVisible,
    slashCommandToken,
    selectedFinderKey,
    selectedFinderItem,
    moveFinderSelection,
    completeFinderItem
  };
};
