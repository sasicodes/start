import type { RootItem } from '@preload/index';
import { type FinderToken, newSessionMentionLabel } from '@renderer/shared/input';

export interface BrowserFinderItem {
  name: string;
  key: 'browser';
  type: 'browser';
  description: string;
}

export interface NewSessionFinderItem {
  name: string;
  key: 'new-session';
  type: 'new-session';
  description: string;
}

export type StaticFinderItem = BrowserFinderItem | NewSessionFinderItem;
export type FinderItems = StaticFinderItem | RootItem;

export const browserFinderItem: BrowserFinderItem = {
  key: 'browser',
  name: 'Browser',
  type: 'browser',
  description: 'Start In-App Browser'
};

export const newSessionFinderItem: NewSessionFinderItem = {
  key: 'new-session',
  type: 'new-session',
  name: newSessionMentionLabel,
  description: 'Start as a new session'
};

const staticFinderEntries: { item: StaticFinderItem; terms: string[] }[] = [
  { item: browserFinderItem, terms: ['browser', 'web'] },
  { item: newSessionFinderItem, terms: ['new', 'session'] }
];

export const staticFinderItems = (token: FinderToken | undefined): StaticFinderItem[] => {
  if (token?.marker !== '@' || token.folderPath) return [];
  const query = token.query.trim().toLowerCase();
  return staticFinderEntries
    .filter(({ terms }) => !query || terms.some((term) => term.startsWith(query)))
    .map(({ item }) => item);
};

export const withStaticFinderItems = (token: FinderToken | undefined, rootItems: RootItem[]): FinderItems[] => [
  ...staticFinderItems(token),
  ...rootItems
];
