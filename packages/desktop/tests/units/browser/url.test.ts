import { normalizeBrowserUrl } from '@main/browser/url';
import { formatBrowserAddress } from '@renderer/shared/browser/url';

describe('normalizeBrowserUrl', () => {
  it('keeps http and https URLs', () => {
    expect(normalizeBrowserUrl('https://example.com')).toBe('https://example.com/');
    expect(normalizeBrowserUrl('https://example.com/docs')).toBe('https://example.com/docs');
    expect(normalizeBrowserUrl('http://localhost:5173/')).toBe('http://localhost:5173/');
  });

  it('adds sensible schemes for typed addresses', () => {
    expect(normalizeBrowserUrl('example.com')).toBe('https://example.com/');
    expect(normalizeBrowserUrl('example.com/docs')).toBe('https://example.com/docs');
    expect(normalizeBrowserUrl('example.com:8443/docs')).toBe('https://example.com:8443/docs');
    expect(normalizeBrowserUrl('localhost:5173')).toBe('http://localhost:5173/');
    expect(normalizeBrowserUrl('127.0.0.1:5173/path')).toBe('http://127.0.0.1:5173/path');
  });

  it('rejects unsupported protocols and empty values', () => {
    expect(normalizeBrowserUrl('')).toBeNull();
    expect(normalizeBrowserUrl('mailto:test@example.com')).toBeNull();
  });

  it('allows local files by URL or absolute path', () => {
    expect(normalizeBrowserUrl('file:///tmp/index.html')).toBe('file:///tmp/index.html');
    expect(normalizeBrowserUrl('/tmp/lesson-01.html')).toBe('file:///tmp/lesson-01.html');
    expect(normalizeBrowserUrl('/tmp/a b.html')).toBe('file:///tmp/a%20b.html');
  });

  it('rejects local files when allowFile is false', () => {
    expect(normalizeBrowserUrl('file:///tmp/index.html', { allowFile: false })).toBeNull();
    expect(normalizeBrowserUrl('/tmp/lesson-01.html', { allowFile: false })).toBeNull();
  });
});

describe('formatBrowserAddress', () => {
  it('shows canonical browser addresses', () => {
    expect(formatBrowserAddress('https://example.com')).toBe('https://example.com/');
    expect(formatBrowserAddress('https://example.com/docs')).toBe('https://example.com/docs');
    expect(formatBrowserAddress(' http://localhost:5173 ')).toBe('http://localhost:5173/');
  });

  it('keeps incomplete typed values readable', () => {
    expect(formatBrowserAddress('')).toBe('');
    expect(formatBrowserAddress('example')).toBe('example');
  });
});
