import type { RootItem } from '@preload/index';
import {
  fallbackRootItemsForFinderToken,
  filterRootItemsForFinderQuery,
  type LoadedFinderItems
} from '@renderer/shared/finder/items';
import { activeFinderToken, type FinderToken } from '@renderer/shared/input';

const tokenFromDraft = (draft: string): FinderToken => {
  const token = activeFinderToken(draft);
  if (!token) throw new Error(`Expected finder token for ${draft}`);
  return token;
};

const rootItems: RootItem[] = [
  { name: 'phone.ts', path: 'src/mobile/phone.ts', type: 'file' },
  { name: 'settings.tsx', path: 'src/settings.tsx', type: 'file' }
];

describe('finder item fallback', () => {
  it('filters cached items by name and path', () => {
    expect(filterRootItemsForFinderQuery(rootItems, 'mobile')).toEqual([rootItems[0]]);
    expect(filterRootItemsForFinderQuery(rootItems, 'settings')).toEqual([rootItems[1]]);
  });

  it('reuses related loaded results while a refined query loads', () => {
    const loadedItems: LoadedFinderItems = { key: 'workspace:p', token: tokenFromDraft('@p'), items: rootItems };

    expect(fallbackRootItemsForFinderToken(tokenFromDraft('@pho'), loadedItems, null).map((item) => item.name)).toEqual(
      ['phone.ts']
    );
  });

  it('keeps stale related results instead of flashing empty while a query loads', () => {
    const loadedItems: LoadedFinderItems = { key: 'workspace:p', token: tokenFromDraft('@p'), items: rootItems };

    expect(fallbackRootItemsForFinderToken(tokenFromDraft('@zzz'), loadedItems, null)).toEqual(rootItems);
  });

  it('uses parent folder items when there are no related loaded results', () => {
    expect(fallbackRootItemsForFinderToken(tokenFromDraft('@set'), null, rootItems)).toEqual([rootItems[1]]);
  });
});
