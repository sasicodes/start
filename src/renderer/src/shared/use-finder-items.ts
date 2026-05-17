import type { RootItem } from '@preload/index';
import type { FinderToken } from '@renderer/shared/input';
import { useEffect, useState } from 'preact/hooks';

const finderItemsCache = new Map<string, RootItem[]>();

const finderCacheKey = (token: Pick<FinderToken, 'folderPath' | 'scope'>) => `${token.scope}:${token.folderPath}`;

export const useFinderItems = (token: FinderToken | undefined) => {
  const [items, setItems] = useState<RootItem[]>([]);

  useEffect(() => {
    window.pi.app
      .listRootItems('', 'workspace')
      .then((rootItems) => finderItemsCache.set('workspace:', rootItems))
      .catch(() => undefined);

    window.pi.app
      .listRootItems('', 'root')
      .then((rootItems) => finderItemsCache.set('root:', rootItems))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let disposed = false;

    if (!token) {
      setItems([]);
      return;
    }

    const cacheKey = finderCacheKey(token);
    const cachedItems = finderItemsCache.get(cacheKey);
    if (cachedItems) setItems(cachedItems);

    window.pi.app
      .listRootItems(token.folderPath, token.scope)
      .then((rootItems) => {
        finderItemsCache.set(cacheKey, rootItems);
        if (!disposed) setItems(rootItems);
      })
      .catch(() => {
        if (!disposed && !cachedItems) setItems([]);
      });

    return () => {
      disposed = true;
    };
  }, [token?.folderPath, token?.scope]);

  return items;
};
