import { completeBrowserOpen } from '@main/browser/requests';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { broadcastsByChannel, resetBroadcasts } from '../../../fakes/window.js';

const captureBrowserSnapshotMock = vi.fn();
const readBrowserScreenshotMock = vi.fn();
const resetBrowserViewportMock = vi.fn();
const resizeBrowserViewportMock = vi.fn();
const scrollInBrowserMock = vi.fn();
const clickInBrowserMock = vi.fn();
const getBrowserStatusMock = vi.fn();
const goBackInBrowserMock = vi.fn();
const goForwardInBrowserMock = vi.fn();
const pressInBrowserMock = vi.fn();
const reloadBrowserMock = vi.fn();
const typeInBrowserMock = vi.fn();

vi.mock('@main/browser/index', () => ({
  typeInBrowser: typeInBrowserMock,
  reloadBrowser: reloadBrowserMock,
  pressInBrowser: pressInBrowserMock,
  scrollInBrowser: scrollInBrowserMock,
  goForwardInBrowser: goForwardInBrowserMock,
  goBackInBrowser: goBackInBrowserMock,
  getBrowserStatus: getBrowserStatusMock,
  clickInBrowser: clickInBrowserMock,
  captureBrowserSnapshot: captureBrowserSnapshotMock,
  readBrowserScreenshot: readBrowserScreenshotMock,
  resetBrowserViewport: resetBrowserViewportMock,
  resizeBrowserViewport: resizeBrowserViewportMock
}));

const { createBrowserTools } = await import('@main/providers/tools/browser/index');

interface TestToolResult {
  details: null;
  content: { type: string; text?: string; data?: string; mimeType?: string }[];
}

interface TestTool {
  name: string;
  label: string;
  description: string;
  promptSnippet: string;
  promptGuidelines: string[];
  execute: (toolCallId: string, args: Record<string, unknown>) => Promise<TestToolResult>;
}

const tools = () => createBrowserTools() as unknown as TestTool[];

const toolByName = (name: string): TestTool => {
  const tool = tools().find((item) => item.name === name);
  if (!tool) throw new Error(`Missing tool ${name}.`);
  return tool;
};

describe('browser tools', () => {
  beforeEach(() => {
    resetBroadcasts();
    readBrowserScreenshotMock.mockResolvedValue({ ok: true, image: 'aW1hZ2U=' });
    resetBrowserViewportMock.mockResolvedValue({ ok: true });
    resizeBrowserViewportMock.mockResolvedValue({ ok: true });
    scrollInBrowserMock.mockResolvedValue({ ok: true });
    captureBrowserSnapshotMock.mockResolvedValue({
      ok: true,
      snapshot: {
        url: 'https://example.com/',
        text: 'Example page content',
        title: 'Example',
        links: [{ url: 'https://example.com/docs', text: 'Docs' }],
        elements: [{ ref: 'e1', tag: 'button', text: 'Continue', role: 'button', label: '', disabled: false }],
        headings: [{ text: 'Example heading', level: 1 }]
      }
    });
    clickInBrowserMock.mockResolvedValue({ ok: true });
    typeInBrowserMock.mockResolvedValue({ ok: true });
    pressInBrowserMock.mockResolvedValue({ ok: true });
    getBrowserStatusMock.mockReturnValue({
      url: 'https://example.com/',
      open: true,
      title: 'Example',
      activeTabId: 'tab-1',
      loading: false,
      tabs: [{ id: 'tab-1', url: 'https://example.com/', title: 'Example', loading: false }],
      canGoBack: true,
      canGoForward: false
    });
    goBackInBrowserMock.mockReturnValue({ ok: true });
    goForwardInBrowserMock.mockReturnValue({ ok: true });
    reloadBrowserMock.mockReturnValue({ ok: true });
  });

  it('defines focused browser tools with useful descriptions', () => {
    const browserTools = tools();

    expect(browserTools.map((tool) => tool.name)).toEqual([
      'browser_open',
      'browser_select',
      'browser_status',
      'browser_back',
      'browser_forward',
      'browser_reload',
      'browser_click',
      'browser_type',
      'browser_scroll',
      'browser_press',
      'browser_screenshot',
      'browser_viewport',
      'browser_snapshot'
    ]);

    for (const tool of browserTools) {
      expect(tool.label).toBe('browser');
      expect(tool.description.length).toBeGreaterThan(30);
      expect(tool.description.length).toBeLessThan(90);
      expect(tool.promptGuidelines).toEqual([
        'Use browser tools only when the user includes @Browser, or while continuing that active @Browser task.'
      ]);
      expect(tool.promptSnippet.length).toBeGreaterThan(30);
      expect(tool.promptSnippet.length).toBeLessThan(80);
    }

    expect(toolByName('browser_open').description).toContain('browser panel');
    expect(toolByName('browser_open').promptSnippet).toContain('local app');
    expect(toolByName('browser_snapshot').promptSnippet).toContain('browser_click/browser_type');
  });

  it('rejects an open request that times out on the unchanged page', async () => {
    vi.useFakeTimers();
    try {
      const pending = toolByName('browser_open').execute('call-timeout', { url: 'https://new.example.com/' });
      const rejected = expect(pending).rejects.toThrow('Browser navigation timed out');
      await vi.advanceTimersByTimeAsync(15100);
      await rejected;
    } finally {
      vi.useRealTimers();
    }
  });

  it('rejects unknown tab ids before requesting navigation', async () => {
    await expect(
      toolByName('browser_open').execute('invalid-tab', {
        url: 'https://example.com/',
        tabId: 'missing-tab'
      })
    ).rejects.toThrow('not available');
    expect(broadcastsByChannel('app:browser-open-request')).toEqual([]);
  });

  it('does not accept a matching URL in the wrong tab', async () => {
    const status = getBrowserStatusMock();
    getBrowserStatusMock.mockReturnValue({
      ...status,
      tabs: [
        ...status.tabs,
        {
          id: 'tab-2',
          url: 'https://example.org/',
          title: 'Other',
          loading: false
        }
      ]
    });
    vi.useFakeTimers();
    try {
      const pending = toolByName('browser_open').execute('wrong-tab', { url: status.url, tabId: 'tab-2' });
      const rejected = expect(pending).rejects.toThrow('Browser navigation timed out');
      await vi.advanceTimersByTimeAsync(15100);
      await rejected;
    } finally {
      vi.useRealTimers();
    }
  });

  it.each([
    ['localhost:5173', 'http://localhost:5173/'],
    ['/tmp/lesson-01.html', 'file:///tmp/lesson-01.html'],
    ['http://example.com', 'http://example.com/']
  ])('opens %s only after its own request completes', async (url, normalizedUrl) => {
    const pending = toolByName('browser_open').execute('call-1', { url });
    const request = broadcastsByChannel('app:browser-open-request')[0]?.args[0] as { requestId: string };
    expect(request).toEqual({ url: normalizedUrl, newTab: true, requestId: expect.any(String) });
    completeBrowserOpen(request.requestId, { ok: true });
    const result = await pending;
    expect(result.content[0]?.text).toBe(`Opened ${normalizedUrl} in the in-app browser.`);
  });

  it('opens URLs in a requested existing browser tab', async () => {
    const pending = toolByName('browser_open').execute('call-1', { url: 'https://example.com', tabId: 'tab-1' });
    const request = broadcastsByChannel('app:browser-open-request')[0]?.args[0] as { requestId: string };
    expect(request).toEqual({
      url: 'https://example.com/',
      tabId: 'tab-1',
      newTab: false,
      requestId: expect.any(String)
    });
    completeBrowserOpen(request.requestId, { ok: true });
    await pending;
  });

  it('reports the actual navigation failure even if another tab has the requested URL', async () => {
    const pending = toolByName('browser_open').execute('call-1', { url: 'https://example.com/' });
    const request = broadcastsByChannel('app:browser-open-request')[0]?.args[0] as { requestId: string };
    completeBrowserOpen(request.requestId, { ok: false, error: 'This site cannot be loaded.' });
    await expect(pending).rejects.toThrow('This site cannot be loaded.');
  });

  it('selects an existing browser tab', async () => {
    getBrowserStatusMock.mockReturnValue({
      url: 'https://example.com/',
      open: true,
      title: 'Example',
      activeTabId: 'tab-1',
      loading: false,
      tabs: [{ id: 'tab-1', url: 'https://example.com/', title: 'Example', loading: false }],
      canGoBack: true,
      canGoForward: false
    });

    const result = await toolByName('browser_select').execute('call-1', { tabId: 'tab-1' });

    expect(broadcastsByChannel('app:browser-select-request')[0]?.args).toEqual([{ tabId: 'tab-1' }]);
    expect(result.content[0]?.text).toBe('Selected browser tab tab-1.');
  });

  it('reports current browser status', async () => {
    const result = await toolByName('browser_status').execute('call-1', {});

    expect(JSON.parse(result.content[0]?.text ?? '{}')).toEqual({
      url: 'https://example.com/',
      open: true,
      title: 'Example',
      activeTabId: 'tab-1',
      loading: false,
      tabs: [{ id: 'tab-1', url: 'https://example.com/', title: 'Example', loading: false }],
      canGoBack: true,
      canGoForward: false
    });
  });

  it('delegates browser navigation actions', async () => {
    await toolByName('browser_back').execute('call-1', { tabId: 'tab-1' });
    await toolByName('browser_forward').execute('call-2', { tabId: 'tab-1' });
    await toolByName('browser_reload').execute('call-3', { tabId: 'tab-1' });
    await toolByName('browser_screenshot').execute('call-4', { tabId: 'tab-1' });

    expect(goBackInBrowserMock).toHaveBeenCalledOnce();
    expect(goForwardInBrowserMock).toHaveBeenCalledOnce();
    expect(reloadBrowserMock).toHaveBeenCalledOnce();
    expect(readBrowserScreenshotMock).toHaveBeenCalledOnce();
  });

  it.each([
    'browser_back',
    'browser_forward',
    'browser_reload',
    'browser_click',
    'browser_type',
    'browser_scroll',
    'browser_press',
    'browser_screenshot',
    'browser_viewport',
    'browser_snapshot'
  ])('rejects missing or inactive tab identities before %s executes', async (name) => {
    await expect(toolByName(name).execute('missing', {})).rejects.toThrow('tab id');
    await expect(toolByName(name).execute('inactive', { tabId: 'tab-other' })).rejects.toThrow('not active');
    for (const action of [
      goBackInBrowserMock,
      goForwardInBrowserMock,
      reloadBrowserMock,
      clickInBrowserMock,
      typeInBrowserMock,
      scrollInBrowserMock,
      pressInBrowserMock,
      readBrowserScreenshotMock,
      resizeBrowserViewportMock,
      resetBrowserViewportMock,
      captureBrowserSnapshotMock
    ]) {
      expect(action).not.toHaveBeenCalled();
    }
  });

  it('keeps standard screenshots as the default and requires explicit high detail', async () => {
    await toolByName('browser_screenshot').execute('standard', { tabId: 'tab-1' });
    expect(readBrowserScreenshotMock).toHaveBeenLastCalledWith('standard');
    await toolByName('browser_screenshot').execute('high', { tabId: 'tab-1', detail: 'high' });
    expect(readBrowserScreenshotMock).toHaveBeenLastCalledWith('high');
    await expect(
      toolByName('browser_screenshot').execute('invalid', { tabId: 'tab-1', detail: 'unlimited' })
    ).rejects.toThrow();
    expect(readBrowserScreenshotMock).toHaveBeenCalledTimes(2);
  });

  it('returns the screenshot as image content', async () => {
    const result = await toolByName('browser_screenshot').execute('call-1', { tabId: 'tab-1' });

    expect(result.content).toEqual([
      { type: 'text', text: 'Screenshot of https://example.com/.' },
      { type: 'image', data: 'aW1hZ2U=', mimeType: 'image/png' }
    ]);
  });

  it('emulates and resets the viewport size', async () => {
    await toolByName('browser_viewport').execute('call-1', { tabId: 'tab-1', width: 390, height: 844 });
    await toolByName('browser_viewport').execute('call-2', { tabId: 'tab-1', reset: true });

    expect(resizeBrowserViewportMock).toHaveBeenCalledWith(390, 844);
    expect(resetBrowserViewportMock).toHaveBeenCalledOnce();
    await expect(toolByName('browser_viewport').execute('call-3', { tabId: 'tab-1' })).rejects.toThrow(
      'viewport width'
    );
  });

  it('scrolls the page in a direction', async () => {
    await toolByName('browser_scroll').execute('call-1', { tabId: 'tab-1', direction: 'down', amount: 400 });

    expect(scrollInBrowserMock).toHaveBeenCalledWith('down', 400);
  });

  it('rejects invalid scroll directions and non-finite distances', async () => {
    await expect(
      toolByName('browser_scroll').execute('call-1', { tabId: 'tab-1', direction: 'diagonal' })
    ).rejects.toThrow();
    await expect(
      toolByName('browser_scroll').execute('call-2', { tabId: 'tab-1', direction: 'down', amount: NaN })
    ).rejects.toThrow();
    expect(scrollInBrowserMock).not.toHaveBeenCalled();
  });

  it('rejects non-finite viewport dimensions', async () => {
    await expect(
      toolByName('browser_viewport').execute('call-1', { tabId: 'tab-1', width: Infinity })
    ).rejects.toThrow();
    await expect(
      toolByName('browser_viewport').execute('call-2', { tabId: 'tab-1', width: 390, height: NaN })
    ).rejects.toThrow();
    expect(resizeBrowserViewportMock).not.toHaveBeenCalled();
  });

  it('preserves whitespace and allows clearing text', async () => {
    await toolByName('browser_type').execute('call-1', { tabId: 'tab-1', ref: 'e1', text: '  hello\n', clear: true });
    expect(typeInBrowserMock).toHaveBeenCalledWith({ ref: 'e1', text: '  hello\n', clear: true });
    await toolByName('browser_type').execute('call-2', { tabId: 'tab-1', ref: 'e1', text: '', clear: true });
    expect(typeInBrowserMock).toHaveBeenLastCalledWith({ ref: 'e1', text: '', clear: true });
  });

  it('reports actual clamped viewport dimensions', async () => {
    const result = await toolByName('browser_viewport').execute('call-1', { tabId: 'tab-1', width: 99999, height: 1 });
    expect(result.content[0]?.text).toContain('4000 × 240');
  });

  it('delegates browser interaction actions', async () => {
    await toolByName('browser_click').execute('call-1', { tabId: 'tab-1', ref: 'e1' });
    await toolByName('browser_type').execute('call-2', { tabId: 'tab-1', ref: 'e2', text: 'hello', clear: true });
    await toolByName('browser_press').execute('call-3', { tabId: 'tab-1', key: 'Enter' });

    expect(clickInBrowserMock).toHaveBeenCalledWith('e1');
    expect(typeInBrowserMock).toHaveBeenCalledWith({ ref: 'e2', text: 'hello', clear: true });
    expect(pressInBrowserMock).toHaveBeenCalledWith('Enter');
  });

  it('defaults browser_type clear to false when omitted', async () => {
    await toolByName('browser_type').execute('call-4', { tabId: 'tab-1', ref: 'e3', text: 'world' });

    expect(typeInBrowserMock).toHaveBeenCalledWith({ ref: 'e3', text: 'world', clear: false });
  });

  it('returns current browser page content snapshots', async () => {
    const result = await toolByName('browser_snapshot').execute('call-1', { tabId: 'tab-1' });

    expect(captureBrowserSnapshotMock).toHaveBeenCalledOnce();
    expect(JSON.parse(result.content[0]?.text ?? '{}')).toEqual({
      tabId: 'tab-1',
      url: 'https://example.com/',
      text: 'Example page content',
      title: 'Example',
      links: [{ url: 'https://example.com/docs', text: 'Docs' }],
      elements: [{ ref: 'e1', tag: 'button', text: 'Continue', role: 'button', label: '', disabled: false }],
      headings: [{ text: 'Example heading', level: 1 }]
    });
  });

  it('reads and interacts with a local file tab the same as any other tab', async () => {
    getBrowserStatusMock.mockReturnValue({
      url: 'file:///tmp/lesson-01.html',
      open: true,
      title: 'lesson',
      activeTabId: 'tab-2',
      loading: false,
      tabs: [{ id: 'tab-2', url: 'file:///tmp/lesson-01.html', title: 'lesson', loading: false }],
      canGoBack: false,
      canGoForward: false
    });

    await toolByName('browser_snapshot').execute('call-1', { tabId: 'tab-2' });
    await toolByName('browser_screenshot').execute('call-2', { tabId: 'tab-2' });
    await toolByName('browser_click').execute('call-3', { tabId: 'tab-2', ref: 'e1' });
    await toolByName('browser_type').execute('call-4', { tabId: 'tab-2', ref: 'e1', text: 'x' });
    await toolByName('browser_press').execute('call-5', { tabId: 'tab-2', key: 'Enter' });

    expect(captureBrowserSnapshotMock).toHaveBeenCalledOnce();
    expect(readBrowserScreenshotMock).toHaveBeenCalledOnce();
    expect(clickInBrowserMock).toHaveBeenCalledWith('e1');
    expect(typeInBrowserMock).toHaveBeenCalledWith({ ref: 'e1', text: 'x', clear: false });
    expect(pressInBrowserMock).toHaveBeenCalledWith('Enter');
  });
});
