import type { RootItem } from '@preload/index';
import { staticFinderItems, withStaticFinderItems } from '@renderer/shared/finder/static';
import { fallbackRootItemsForFinderToken, type LoadedFinderItems } from '@renderer/shared/finder/items';
import type { FinderToken } from '@renderer/shared/input';
import { useEffect, useMemo, useState } from 'preact/hooks';

const finderItemsCache = new Map<string, RootItem[]>();
const finderItemsCacheMaxEntries = 80;

export const clearFinderItemsCache = () => {
  finderItemsCache.clear();
};

const setFinderItemsCache = (key: string, items: RootItem[]) => {
  if (finderItemsCache.has(key)) finderItemsCache.delete(key);
  finderItemsCache.set(key, items);

  while (finderItemsCache.size > finderItemsCacheMaxEntries) {
    const oldestKey = finderItemsCache.keys().next().value;
    if (!oldestKey) return;
    finderItemsCache.delete(oldestKey);
  }
};

const finderCacheKey = (token: Pick<FinderToken, 'scope' | 'value'>) => `${token.scope}:${token.value}`;

const folderCacheKey = (token: FinderToken) =>
  finderCacheKey({ scope: token.scope, value: token.folderPath ? `${token.folderPath}/` : '' });

export const useFinderItems = (token: FinderToken | undefined) => {
  const [loadedItems, setLoadedItems] = useState<LoadedFinderItems | null>(null);

  useEffect(() => {
    window.pi.app
      .listRootItems('', 'workspace')
      .then((rootItems) => setFinderItemsCache('workspace:', rootItems))
      .catch(() => {});

    window.pi.app
      .listRootItems('', 'root')
      .then((rootItems) => setFinderItemsCache('root:', rootItems))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let disposed = false;

    if (!token) return;

    const cacheKey = finderCacheKey(token);

    window.pi.app
      .listRootItems(token.value, token.scope)
      .then((rootItems) => {
        setFinderItemsCache(cacheKey, rootItems);
        if (!disposed) setLoadedItems({ items: rootItems, key: cacheKey, token });
      })
      .catch(() => {
        if (!disposed) setLoadedItems((current) => (current?.key === cacheKey ? current : null));
      });

    return () => {
      disposed = true;
    };
  }, [token?.scope, token?.value]);

  return useMemo(() => {
    if (!token) return [];

    const cacheKey = finderCacheKey(token);
    if (loadedItems?.key === cacheKey) return withStaticFinderItems(loadedItems.token, loadedItems.items);

    const cachedItems = finderItemsCache.get(cacheKey);
    if (cachedItems) return withStaticFinderItems(token, cachedItems);

    const fallbackItems = fallbackRootItemsForFinderToken(
      token,
      loadedItems,
      finderItemsCache.get(folderCacheKey(token)) ?? null
    );
    return fallbackItems.length > 0 ? withStaticFinderItems(token, fallbackItems) : staticFinderItems(token);
  }, [loadedItems, token]);
};
