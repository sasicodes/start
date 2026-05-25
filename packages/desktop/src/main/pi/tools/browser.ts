import {
  captureBrowserScreenshot,
  captureBrowserSnapshot,
  getBrowserStatus,
  goBackInBrowser,
  goForwardInBrowser,
  reloadBrowser
} from '@main/browser/index';
import { normalizeBrowserUrl } from '@main/browser/url';
import { sendToMainWindow } from '@main/window';
import { defineTool } from '@earendil-works/pi-coding-agent';

const openPollMs = 100;
const openTimeoutMs = 5000;

const emptySchema = {
  required: [],
  type: 'object',
  properties: {},
  additionalProperties: false
} as const;

const browserOpenSchema = {
  properties: {
    url: {
      type: 'string',
      description: 'HTTP or HTTPS URL.'
    }
  },
  type: 'object',
  required: ['url'],
  additionalProperties: false
} as const;

const textResult = (text: string) => ({ details: null, content: [{ text, type: 'text' as const }] });

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForBrowserOpen = async (expectedUrl: string) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < openTimeoutMs) {
    const status = getBrowserStatus();
    if (status.open && status.url === expectedUrl) return status;
    await wait(openPollMs);
  }

  return getBrowserStatus();
};

export const createBrowserTools = () => [
  defineTool({
    label: 'browser',
    async execute(_toolCallId, { url }) {
      const normalizedUrl = normalizeBrowserUrl(url);
      if (!normalizedUrl) throw new Error('Enter a valid http or https URL.');

      sendToMainWindow('app:browser-open-request', normalizedUrl);
      const status = await waitForBrowserOpen(normalizedUrl);
      if (!status.open || !status.url) throw new Error('Browser did not open.');

      return textResult(`Opened ${normalizedUrl} in the in-app browser.`);
    },
    name: 'browser_open',
    parameters: browserOpenSchema,
    description: 'Open an HTTP or HTTPS URL in the browser panel.',
    promptSnippet: 'Use for pages the user asks to inspect, read, summarize, or view.'
  }),
  defineTool({
    label: 'browser',
    async execute() {
      const status = getBrowserStatus();
      return textResult(
        JSON.stringify({
          url: status.url,
          open: status.open,
          title: status.title,
          loading: status.loading,
          canGoBack: status.canGoBack,
          canGoForward: status.canGoForward
        })
      );
    },
    name: 'browser_status',
    parameters: emptySchema,
    description: 'Read the browser URL, title, loading, and history state.',
    promptSnippet: 'Use to check what page is open and whether navigation is available.'
  }),
  defineTool({
    label: 'browser',
    async execute() {
      const result = goBackInBrowser();
      if (!result.ok) throw new Error(result.error ?? 'Could not go back in the browser.');
      return textResult('Went back in the in-app browser.');
    },
    name: 'browser_back',
    parameters: emptySchema,
    description: 'Go back one browser history entry.',
    promptSnippet: 'Use after browser_status shows back history is available.'
  }),
  defineTool({
    label: 'browser',
    async execute() {
      const result = goForwardInBrowser();
      if (!result.ok) throw new Error(result.error ?? 'Could not go forward in the browser.');
      return textResult('Went forward in the in-app browser.');
    },
    name: 'browser_forward',
    parameters: emptySchema,
    description: 'Go forward one browser history entry.',
    promptSnippet: 'Use after browser_status shows forward history is available.'
  }),
  defineTool({
    label: 'browser',
    async execute() {
      const result = reloadBrowser();
      if (!result.ok) throw new Error(result.error ?? 'Could not reload the browser.');
      return textResult('Reloaded the in-app browser.');
    },
    name: 'browser_reload',
    parameters: emptySchema,
    description: 'Reload the current browser page.',
    promptSnippet: 'Refresh the open browser page after stale page state.'
  }),
  defineTool({
    label: 'browser',
    async execute() {
      const result = await captureBrowserScreenshot();
      if (!result.ok) throw new Error(result.error ?? 'Could not capture the browser screenshot.');
      return textResult('Captured the in-app browser screenshot to the clipboard.');
    },
    parameters: emptySchema,
    name: 'browser_screenshot',
    description: 'Copy a screenshot of the visible browser page.',
    promptSnippet: 'Requires an open browser page; copies the visible page.'
  }),
  defineTool({
    label: 'browser',
    async execute() {
      const result = await captureBrowserSnapshot();
      if (!result.ok || !result.snapshot) throw new Error(result.error ?? 'Could not read the browser page.');
      return textResult(JSON.stringify(result.snapshot));
    },
    parameters: emptySchema,
    name: 'browser_snapshot',
    description: 'Read bounded text, headings, and links from the open browser page.',
    promptSnippet: 'Use to summarize or answer questions about the open page.'
  })
];
