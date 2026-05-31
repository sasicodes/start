import {
  clearBrowserNavigation,
  emptyBrowserNavigation,
  nextBrowserNavigation,
  nextBrowserTabSelection
} from '@renderer/shared/browser/navigation';

describe('browser navigation', () => {
  it('increments the navigation id for repeated URLs', () => {
    const first = nextBrowserNavigation(emptyBrowserNavigation, 'https://example.com/');
    const second = nextBrowserNavigation(first, 'https://example.com/');

    expect(first).toEqual({ id: 1, url: 'https://example.com/', tabId: '', newTab: false });
    expect(second).toEqual({ id: 2, url: 'https://example.com/', tabId: '', newTab: false });
  });

  it('marks navigation that should open in a new tab', () => {
    expect(nextBrowserNavigation(emptyBrowserNavigation, 'https://example.com/', true)).toEqual({
      id: 1,
      newTab: true,
      tabId: '',
      url: 'https://example.com/'
    });
  });

  it('marks navigation that should target an existing tab', () => {
    expect(nextBrowserNavigation(emptyBrowserNavigation, 'https://example.com/', false, 'tab-1')).toEqual({
      id: 1,
      newTab: false,
      tabId: 'tab-1',
      url: 'https://example.com/'
    });
  });

  it('marks an existing tab for selection', () => {
    expect(nextBrowserTabSelection(emptyBrowserNavigation, 'tab-2')).toEqual({
      id: 1,
      url: '',
      tabId: 'tab-2',
      newTab: false
    });
  });

  it('clears the pending URL without changing the navigation id', () => {
    const navigation = nextBrowserNavigation(emptyBrowserNavigation, 'https://example.com/');

    expect(clearBrowserNavigation(navigation)).toEqual({ id: 1, url: '', tabId: '', newTab: false });
    expect(clearBrowserNavigation(emptyBrowserNavigation)).toBe(emptyBrowserNavigation);
  });
});
