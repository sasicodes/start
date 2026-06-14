import type { RootItem } from '@preload/index';
import type { FinderToken } from '@renderer/shared/input';

export interface LoadedFinderItems {
  key: string;
  token: FinderToken;
  items: RootItem[];
}

const rootItemMatchesQuery = (item: RootItem, query: string) => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;
  return item.name.toLowerCase().includes(normalizedQuery) || item.path.toLowerCase().includes(normalizedQuery);
};

export const filterRootItemsForFinderQuery = (items: RootItem[], query: string) =>
  items.filter((item) => rootItemMatchesQuery(item, query));

const loadedItemsMatchFolder = (loadedItems: LoadedFinderItems, token: FinderToken) =>
  loadedItems.token.scope === token.scope && loadedItems.token.folderPath === token.folderPath;

export const fallbackRootItemsForFinderToken = (
  token: FinderToken,
  loadedItems: LoadedFinderItems | null,
  parentItems: RootItem[] | null
) => {
  if (loadedItems && loadedItemsMatchFolder(loadedItems, token)) {
    const filteredItems = filterRootItemsForFinderQuery(loadedItems.items, token.query);
    if (filteredItems.length > 0) return filteredItems;
    return loadedItems.items;
  }

  return parentItems ? filterRootItemsForFinderQuery(parentItems, token.query) : [];
};
