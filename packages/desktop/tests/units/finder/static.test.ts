import type { RootItem } from '@preload/index';
import {
  browserFinderItem,
  newSessionFinderItem,
  staticFinderItems,
  withStaticFinderItems
} from '@renderer/shared/finder/static';
import { activeFinderToken, type FinderToken } from '@renderer/shared/input';
import { describe, expect, it } from 'vitest';

const tokenFromDraft = (draft: string): FinderToken => {
  const token = activeFinderToken(draft);
  if (!token) throw new Error(`Expected finder token for ${draft}`);
  return token;
};

describe('finder items', () => {
  it('puts Browser then New Session first in the top-level mention popover', () => {
    const items: RootItem[] = [{ name: 'src', path: 'src', type: 'directory' }];

    expect(withStaticFinderItems(tokenFromDraft('@'), items).map((item) => item.name)).toEqual([
      'Browser',
      'New Session',
      'src'
    ]);
  });

  it('keeps static items out of unrelated searches', () => {
    expect(staticFinderItems(tokenFromDraft('@src'))).toEqual([]);
  });

  it('matches Browser through focused browser search terms', () => {
    expect(staticFinderItems(tokenFromDraft('@bro'))).toEqual([browserFinderItem]);
    expect(staticFinderItems(tokenFromDraft('@web'))).toEqual([browserFinderItem]);
  });

  it('matches New Session through new and session search terms', () => {
    expect(staticFinderItems(tokenFromDraft('@new'))).toEqual([newSessionFinderItem]);
    expect(staticFinderItems(tokenFromDraft('@sess'))).toEqual([newSessionFinderItem]);
  });

  it('keeps nested file browsing scoped to files', () => {
    expect(staticFinderItems(tokenFromDraft('@src/'))).toEqual([]);
  });
});
