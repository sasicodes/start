import {
  clearBrowserNavigation,
  emptyBrowserNavigation,
  nextBrowserNavigation
} from '@renderer/shared/browser/navigation';

describe('browser navigation', () => {
  it('increments the navigation id for repeated URLs', () => {
    const first = nextBrowserNavigation(emptyBrowserNavigation, 'https://example.com/');
    const second = nextBrowserNavigation(first, 'https://example.com/');

    expect(first).toEqual({ id: 1, url: 'https://example.com/' });
    expect(second).toEqual({ id: 2, url: 'https://example.com/' });
  });

  it('clears the pending URL without changing the navigation id', () => {
    const navigation = nextBrowserNavigation(emptyBrowserNavigation, 'https://example.com/');

    expect(clearBrowserNavigation(navigation)).toEqual({ id: 1, url: '' });
    expect(clearBrowserNavigation(emptyBrowserNavigation)).toBe(emptyBrowserNavigation);
  });
});
