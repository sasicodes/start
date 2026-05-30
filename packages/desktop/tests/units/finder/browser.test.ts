import type { RootItem } from '@preload/index';
import { browserFinderItem, browserFinderItems, withBrowserFinderItems } from '@renderer/shared/finder/browser';
import { activeFinderToken, type FinderToken } from '@renderer/shared/input';
import { describe, expect, it } from 'vitest';

const tokenFromDraft = (draft: string): FinderToken => {
  const token = activeFinderToken(draft);
  if (!token) throw new Error(`Expected finder token for ${draft}`);
  return token;
};

describe('finder items', () => {
  it('puts Browser first in the top-level mention popover', () => {
    const items: RootItem[] = [{ name: 'src', path: 'src', type: 'directory' }];

    expect(withBrowserFinderItems(tokenFromDraft('@'), items).map((item) => item.name)).toEqual(['Browser', 'src']);
  });

  it('keeps Browser out of unrelated searches', () => {
    expect(browserFinderItems(tokenFromDraft('@src'))).toEqual([]);
  });

  it('matches Browser through focused browser search terms', () => {
    expect(browserFinderItems(tokenFromDraft('@bro'))).toEqual([browserFinderItem]);
    expect(browserFinderItems(tokenFromDraft('@web'))).toEqual([browserFinderItem]);
  });

  it('keeps nested file browsing scoped to files', () => {
    expect(browserFinderItems(tokenFromDraft('@src/'))).toEqual([]);
  });
});
