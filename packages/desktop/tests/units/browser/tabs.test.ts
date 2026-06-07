import { pickReusableTab } from '@main/browser/tabs';

describe('pickReusableTab', () => {
  it('reuses a tab already showing the same URL', () => {
    const tabs = [
      { id: 'a', url: 'https://example.com/', blank: false },
      { id: 'b', url: '', blank: true }
    ];

    expect(pickReusableTab(tabs, 'https://example.com/')?.id).toBe('a');
  });

  it('reuses a blank tab when no tab shows the URL', () => {
    const tabs = [
      { id: 'a', url: 'https://example.com/', blank: false },
      { id: 'b', url: '', blank: true }
    ];

    expect(pickReusableTab(tabs, 'https://google.com/')?.id).toBe('b');
  });

  it('prefers an exact URL match over a blank tab', () => {
    const tabs = [
      { id: 'a', url: '', blank: true },
      { id: 'b', url: 'https://google.com/', blank: false }
    ];

    expect(pickReusableTab(tabs, 'https://google.com/')?.id).toBe('b');
  });

  it('returns null when no tab matches and none are blank', () => {
    const tabs = [
      { id: 'a', url: 'https://example.com/', blank: false },
      { id: 'b', url: 'https://google.com/', blank: false }
    ];

    expect(pickReusableTab(tabs, 'https://other.com/')).toBeNull();
  });

  it('returns null for an empty tab list', () => {
    expect(pickReusableTab([], 'https://example.com/')).toBeNull();
  });
});
