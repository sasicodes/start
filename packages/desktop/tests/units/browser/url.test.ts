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

  it('rejects local files by default (fails closed)', () => {
    expect(normalizeBrowserUrl('file:///tmp/index.html')).toBeNull();
    expect(normalizeBrowserUrl('/tmp/lesson-01.html')).toBeNull();
    expect(normalizeBrowserUrl('file:///tmp/index.html', { allowFile: false })).toBeNull();
    expect(normalizeBrowserUrl('/tmp/lesson-01.html', { allowFile: false })).toBeNull();
  });

  it('allows local files by URL or absolute path when allowFile is true', () => {
    expect(normalizeBrowserUrl('file:///tmp/index.html', { allowFile: true })).toBe('file:///tmp/index.html');
    expect(normalizeBrowserUrl('/tmp/lesson-01.html', { allowFile: true })).toBe('file:///tmp/lesson-01.html');
    expect(normalizeBrowserUrl('/tmp/a b.html', { allowFile: true })).toBe('file:///tmp/a%20b.html');
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
