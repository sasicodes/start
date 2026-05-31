import {
  captureBrowserScreenshot,
  captureBrowserSnapshot,
  clickInBrowser,
  getBrowserStatus,
  goBackInBrowser,
  goForwardInBrowser,
  pressInBrowser,
  reloadBrowser,
  typeInBrowser
} from '@main/browser/index';
import { normalizeBrowserUrl } from '@main/browser/url';
import { sendToMainWindow } from '@main/window';
import { defineTool } from '@earendil-works/pi-coding-agent';

const openPollMs = 100;
const openTimeoutMs = 5000;

const emptySchema = {
  type: 'object',
  required: [],
  properties: {},
  additionalProperties: false
} as const;

const browserOpenSchema = {
  type: 'object',
  required: ['url'],
  properties: {
    url: {
      type: 'string',
      description: 'HTTP or HTTPS URL.'
    },
    tabId: {
      type: 'string',
      description: 'Existing browser tab id from browser_status.'
    },
    newTab: {
      type: 'boolean',
      description: 'Open the URL in a separate browser tab when true.'
    }
  },
  additionalProperties: false
} as const;

const browserSelectSchema = {
  type: 'object',
  required: ['tabId'],
  properties: {
    tabId: {
      type: 'string',
      description: 'Browser tab id from browser_status.'
    }
  },
  additionalProperties: false
} as const;

const browserClickSchema = {
  type: 'object',
  required: ['ref'],
  properties: {
    ref: {
      type: 'string',
      description: 'Element ref from browser_snapshot, such as e1.'
    }
  },
  additionalProperties: false
} as const;

const browserTypeSchema = {
  type: 'object',
  required: ['ref', 'text'],
  properties: {
    ref: {
      type: 'string',
      description: 'Input element ref from browser_snapshot, such as e1.'
    },
    text: {
      type: 'string',
      description: 'Text to enter.'
    },
    clear: {
      type: 'boolean',
      description: 'Replace existing text when true.'
    }
  },
  additionalProperties: false
} as const;

const browserPressSchema = {
  type: 'object',
  required: ['key'],
  properties: {
    key: {
      type: 'string',
      description: 'One supported key, such as Enter, Tab, Escape, or ArrowDown.'
    }
  },
  additionalProperties: false
} as const;

const textResult = (text: string) => ({ details: null, content: [{ text, type: 'text' as const }] });

const requiredString = (value: unknown, label: string) => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Enter a browser ${label}.`);
  return value;
};

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

const waitForBrowserSelection = async (tabId: string) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < openTimeoutMs) {
    const status = getBrowserStatus();
    if (status.open && status.activeTabId === tabId) return status;
    await wait(openPollMs);
  }

  return getBrowserStatus();
};

export const createBrowserTools = () => [
  defineTool({
    label: 'browser',
    async execute(_toolCallId, { url, newTab, tabId }) {
      const normalizedUrl = normalizeBrowserUrl(url);
      if (!normalizedUrl) throw new Error('Enter a valid http or https URL.');

      const tabIdValue = typeof tabId === 'string' ? tabId.trim() : '';
      sendToMainWindow('app:browser-open-request', {
        url: normalizedUrl,
        ...(tabIdValue ? { tabId: tabIdValue, newTab: newTab === true } : { newTab: newTab !== false })
      });
      const status = await waitForBrowserOpen(normalizedUrl);
      if (!status.open || !status.url) throw new Error('Browser did not open.');

      return textResult(`Opened ${normalizedUrl} in the in-app browser.`);
    },
    name: 'browser_open',
    parameters: browserOpenSchema,
    description: 'Open an HTTP or HTTPS URL in the browser panel for explicit viewing or interaction.',
    promptSnippet: 'Use when the user asks to open/view a page, test a local app, or inspect visual state.'
  }),
  defineTool({
    label: 'browser',
    async execute(_toolCallId, { tabId }) {
      const tabIdValue = requiredString(tabId, 'tab id');
      sendToMainWindow('app:browser-select-request', { tabId: tabIdValue });
      const status = await waitForBrowserSelection(tabIdValue);
      if (status.activeTabId !== tabIdValue) throw new Error('Browser tab did not open.');

      return textResult(`Selected browser tab ${tabIdValue}.`);
    },
    name: 'browser_select',
    parameters: browserSelectSchema,
    description: 'Select an existing browser tab by id.',
    promptSnippet: 'Use browser_status first, then select a listed tab id.'
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
          activeTabId: status.activeTabId,
          canGoForward: status.canGoForward,
          tabs: status.tabs
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
    async execute(_toolCallId, { ref }) {
      const refValue = requiredString(ref, 'element ref');
      const result = await clickInBrowser(refValue);
      if (!result.ok) throw new Error(result.error ?? 'Could not click the browser element.');
      return textResult(`Clicked browser element ${refValue}.`);
    },
    name: 'browser_click',
    parameters: browserClickSchema,
    description: 'Click an element ref from browser_snapshot.',
    promptSnippet: 'Use browser_snapshot first, then click a listed element ref.'
  }),
  defineTool({
    label: 'browser',
    async execute(_toolCallId, { ref, text, clear }) {
      const refValue = requiredString(ref, 'element ref');
      const textValue = requiredString(text, 'text value');
      const result = await typeInBrowser({ ref: refValue, text: textValue, clear: clear === true });
      if (!result.ok) throw new Error(result.error ?? 'Could not type into the browser element.');
      return textResult(`Typed into browser element ${refValue}.`);
    },
    name: 'browser_type',
    parameters: browserTypeSchema,
    description: 'Type text into an input ref from browser_snapshot.',
    promptSnippet: 'Use browser_snapshot first, then type into a listed input ref.'
  }),
  defineTool({
    label: 'browser',
    async execute(_toolCallId, { key }) {
      const keyValue = requiredString(key, 'key');
      const result = pressInBrowser(keyValue);
      if (!result.ok) throw new Error(result.error ?? 'Could not press the browser key.');
      return textResult(`Pressed ${keyValue} in the browser.`);
    },
    name: 'browser_press',
    parameters: browserPressSchema,
    description: 'Press a supported key in the browser page.',
    promptSnippet: 'Use for Enter, Tab, Escape, arrows, deletion, or paging keys.'
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
    description: 'Read page text, links, headings, and element refs.',
    promptSnippet: 'Use for the current browser page or to find refs for browser_click/browser_type.'
  })
];
