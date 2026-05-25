import { browserLinkHrefFromAnchor } from '@renderer/shared/browser/link';

describe('browser link handling', () => {
  it('accepts http and https links for the in-app browser', () => {
    expect(browserLinkHrefFromAnchor({ href: 'https://example.com/', protocol: 'https:' })).toBe(
      'https://example.com/'
    );
    expect(browserLinkHrefFromAnchor({ href: 'http://localhost:5173/', protocol: 'http:' })).toBe(
      'http://localhost:5173/'
    );
  });

  it('ignores links that the browser panel should not own', () => {
    expect(browserLinkHrefFromAnchor({ href: 'mailto:hello@example.com', protocol: 'mailto:' })).toBe('');
    expect(browserLinkHrefFromAnchor({ href: 'file:///tmp/example.txt', protocol: 'file:' })).toBe('');
  });
});
