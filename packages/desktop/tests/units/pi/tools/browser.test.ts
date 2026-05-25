import { beforeEach, describe, expect, it, vi } from 'vitest';
import { broadcastsByChannel, resetBroadcasts } from '../../../fakes/window.js';

const captureBrowserScreenshotMock = vi.fn();
const captureBrowserSnapshotMock = vi.fn();
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
  goForwardInBrowser: goForwardInBrowserMock,
  goBackInBrowser: goBackInBrowserMock,
  getBrowserStatus: getBrowserStatusMock,
  clickInBrowser: clickInBrowserMock,
  captureBrowserSnapshot: captureBrowserSnapshotMock,
  captureBrowserScreenshot: captureBrowserScreenshotMock
}));

const { createBrowserTools } = await import('@main/pi/tools/browser');

interface TestToolResult {
  details: null;
  content: { type: string; text: string }[];
}

interface TestTool {
  name: string;
  label: string;
  description: string;
  promptSnippet: string;
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
    captureBrowserScreenshotMock.mockResolvedValue({ ok: true });
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
    pressInBrowserMock.mockReturnValue({ ok: true });
    getBrowserStatusMock.mockReturnValue({
      url: 'https://example.com/',
      open: true,
      title: 'Example',
      loading: false,
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
      'browser_status',
      'browser_back',
      'browser_forward',
      'browser_reload',
      'browser_click',
      'browser_type',
      'browser_press',
      'browser_screenshot',
      'browser_snapshot'
    ]);

    for (const tool of browserTools) {
      expect(tool.label).toBe('browser');
      expect(tool.description.length).toBeGreaterThan(30);
      expect(tool.description.length).toBeLessThan(90);
      expect(tool.promptSnippet.length).toBeGreaterThan(30);
      expect(tool.promptSnippet.length).toBeLessThan(90);
    }

    expect(toolByName('browser_open').description).toContain('browser panel');
    expect(toolByName('browser_open').promptSnippet).toContain('inspect, read, summarize, or view');
    expect(toolByName('browser_snapshot').promptSnippet).toContain('open page');
  });

  it('opens normalized URLs in the app browser', async () => {
    getBrowserStatusMock
      .mockReturnValueOnce({
        url: '',
        open: false,
        title: '',
        loading: false,
        canGoBack: false,
        canGoForward: false
      })
      .mockReturnValueOnce({
        url: 'http://localhost:5173/',
        open: true,
        title: '',
        loading: true,
        canGoBack: false,
        canGoForward: false
      });

    const result = await toolByName('browser_open').execute('call-1', { url: 'localhost:5173' });

    expect(getBrowserStatusMock).toHaveBeenCalled();
    expect(broadcastsByChannel('app:browser-open-request')[0]?.args).toEqual(['http://localhost:5173/']);
    expect(result.content[0]?.text).toBe('Opened http://localhost:5173/ in the in-app browser.');
  });

  it('reports current browser status', async () => {
    const result = await toolByName('browser_status').execute('call-1', {});

    expect(JSON.parse(result.content[0]?.text ?? '{}')).toEqual({
      url: 'https://example.com/',
      open: true,
      title: 'Example',
      loading: false,
      canGoBack: true,
      canGoForward: false
    });
  });

  it('delegates browser navigation actions', async () => {
    await toolByName('browser_back').execute('call-1', {});
    await toolByName('browser_forward').execute('call-2', {});
    await toolByName('browser_reload').execute('call-3', {});
    await toolByName('browser_screenshot').execute('call-4', {});

    expect(goBackInBrowserMock).toHaveBeenCalledOnce();
    expect(goForwardInBrowserMock).toHaveBeenCalledOnce();
    expect(reloadBrowserMock).toHaveBeenCalledOnce();
    expect(captureBrowserScreenshotMock).toHaveBeenCalledOnce();
  });

  it('delegates browser interaction actions', async () => {
    await toolByName('browser_click').execute('call-1', { ref: 'e1' });
    await toolByName('browser_type').execute('call-2', { ref: 'e2', text: 'hello', clear: true });
    await toolByName('browser_press').execute('call-3', { key: 'Enter' });

    expect(clickInBrowserMock).toHaveBeenCalledWith('e1');
    expect(typeInBrowserMock).toHaveBeenCalledWith({ ref: 'e2', text: 'hello', clear: true });
    expect(pressInBrowserMock).toHaveBeenCalledWith('Enter');
  });

  it('returns current browser page content snapshots', async () => {
    const result = await toolByName('browser_snapshot').execute('call-1', {});

    expect(captureBrowserSnapshotMock).toHaveBeenCalledOnce();
    expect(JSON.parse(result.content[0]?.text ?? '{}')).toEqual({
      url: 'https://example.com/',
      text: 'Example page content',
      title: 'Example',
      links: [{ url: 'https://example.com/docs', text: 'Docs' }],
      elements: [{ ref: 'e1', tag: 'button', text: 'Continue', role: 'button', label: '', disabled: false }],
      headings: [{ text: 'Example heading', level: 1 }]
    });
  });
});
