import type { RootItem } from '@preload/index';
import type { FinderToken } from '@renderer/shared/input';

export interface BrowserFinderItem {
  name: string;
  key: 'browser';
  type: 'browser';
  description: string;
}

export type FinderItems = BrowserFinderItem | RootItem;

const browserFinderSearchTerms = ['browser', 'web'];

export const browserFinderItem: BrowserFinderItem = {
  key: 'browser',
  name: 'Browser',
  type: 'browser',
  description: 'Start In-App Browser'
};

const browserFinderItemMatches = (query: string) => {
  const normalizedQuery = query.trim().toLowerCase();
  return !normalizedQuery || browserFinderSearchTerms.some((term) => term.startsWith(normalizedQuery));
};

export const browserFinderItems = (token: FinderToken | undefined): BrowserFinderItem[] => {
  if (!token || token.marker !== '@' || token.folderPath) return [];
  return browserFinderItemMatches(token.query) ? [browserFinderItem] : [];
};

export const withBrowserFinderItems = (token: FinderToken | undefined, rootItems: RootItem[]): FinderItems[] => [
  ...browserFinderItems(token),
  ...rootItems
];
