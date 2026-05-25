export interface BrowserNavigation {
  id: number;
  url: string;
}

export const emptyBrowserNavigation: BrowserNavigation = {
  id: 0,
  url: ''
};

export const clearBrowserNavigation = (navigation: BrowserNavigation): BrowserNavigation => {
  if (!navigation.url) return navigation;
  return { ...navigation, url: '' };
};

export const nextBrowserNavigation = (navigation: BrowserNavigation, url: string): BrowserNavigation => ({
  id: navigation.id + 1,
  url
});
