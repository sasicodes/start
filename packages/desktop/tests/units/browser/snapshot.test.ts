import { parseBrowserSnapshot, readBrowserSnapshot } from '@main/browser/snapshot';
import type { WebContents } from 'electron';
import { describe, expect, it } from 'vitest';

describe('parseBrowserSnapshot', () => {
  it('keeps only valid browser snapshot fields', () => {
    expect(
      parseBrowserSnapshot({
        url: 'https://example.com/',
        text: 'Example body',
        title: 'Example',
        links: [
          { url: 'https://example.com/docs', text: 'Docs' },
          { url: '', text: 'Missing URL' },
          { url: 'https://example.com/empty', text: '' }
        ],
        elements: [
          { ref: 'e1', tag: 'button', text: 'Submit', role: 'button', label: '', disabled: false },
          { ref: '', tag: 'input', text: 'Search', role: 'input', label: 'Search', disabled: false }
        ],
        headings: [
          { text: 'Overview', level: 1 },
          { text: '', level: 2 },
          { text: 'Broken', level: 0 }
        ]
      })
    ).toEqual({
      url: 'https://example.com/',
      text: 'Example body',
      title: 'Example',
      links: [{ url: 'https://example.com/docs', text: 'Docs' }],
      elements: [{ ref: 'e1', tag: 'button', text: 'Submit', role: 'button', label: '', disabled: false }],
      headings: [{ text: 'Overview', level: 1 }]
    });
  });

  it('rejects non-object snapshots', () => {
    expect(parseBrowserSnapshot(null)).toBeNull();
    expect(parseBrowserSnapshot('snapshot')).toBeNull();
  });

  it('returns null when browser script execution fails', async () => {
    const webContents = {
      isLoading: () => false,
      executeJavaScript: async () => {
        throw new Error('navigation interrupted');
      }
    } as unknown as WebContents;

    await expect(readBrowserSnapshot(webContents)).resolves.toBeNull();
  });
});
