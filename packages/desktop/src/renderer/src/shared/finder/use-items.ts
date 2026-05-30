import type { RootItem } from '@preload/index';
import { browserFinderItems, withBrowserFinderItems, type FinderItems } from '@renderer/shared/finder/browser';
import type { FinderToken } from '@renderer/shared/input';
import { useEffect, useState } from 'preact/hooks';

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

export const useFinderItems = (token: FinderToken | undefined) => {
  const [items, setItems] = useState<FinderItems[]>([]);

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

    if (!token) {
      setItems([]);
      return;
    }

    const cacheKey = finderCacheKey(token);
    const cachedItems = finderItemsCache.get(cacheKey);
    if (cachedItems) setItems(withBrowserFinderItems(token, cachedItems));

    window.pi.app
      .listRootItems(token.value, token.scope)
      .then((rootItems) => {
        setFinderItemsCache(cacheKey, rootItems);
        if (!disposed) setItems(withBrowserFinderItems(token, rootItems));
      })
      .catch(() => {
        if (!disposed && !cachedItems) setItems(browserFinderItems(token));
      });

    return () => {
      disposed = true;
    };
  }, [token?.scope, token?.value]);

  return items;
};
