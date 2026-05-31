export interface BrowserNavigation {
  id: number;
  url: string;
  tabId: string;
  newTab: boolean;
}

export const emptyBrowserNavigation: BrowserNavigation = {
  id: 0,
  url: '',
  tabId: '',
  newTab: false
};

export const clearBrowserNavigation = (navigation: BrowserNavigation): BrowserNavigation => {
  if (!navigation.url && !navigation.tabId) return navigation;
  return { ...navigation, url: '', tabId: '' };
};

export const nextBrowserNavigation = (
  navigation: BrowserNavigation,
  url: string,
  newTab = false,
  tabId = ''
): BrowserNavigation => ({
  id: navigation.id + 1,
  url,
  tabId,
  newTab
});

export const nextBrowserTabSelection = (navigation: BrowserNavigation, tabId: string): BrowserNavigation => ({
  ...navigation,
  id: navigation.id + 1,
  tabId,
  url: ''
});
