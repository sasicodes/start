import { defineTool } from '@earendil-works/pi-coding-agent';
import {
  captureBrowserSnapshot,
  clickInBrowser,
  getBrowserStatus,
  goBackInBrowser,
  goForwardInBrowser,
  pressInBrowser,
  readBrowserScreenshot,
  reloadBrowser,
  resetBrowserViewport,
  resizeBrowserViewport,
  scrollInBrowser,
  typeInBrowser
} from '@main/browser/index';
import { normalizeBrowserUrl } from '@main/browser/url';
import { browserViewportMetrics } from '@main/browser/viewport';
import {
  requireActiveTab,
  requiredString,
  waitForBrowserOpen,
  waitForBrowserSelection
} from '@main/providers/tools/browser/navigation';
import {
  browserClickSchema,
  browserOpenSchema,
  browserPressSchema,
  browserScrollSchema,
  browserSelectSchema,
  browserTypeSchema,
  browserViewportSchema,
  emptySchema,
  screenshotSchema,
  tabSchema
} from '@main/providers/tools/browser/schemas';
import { toolImageResult, toolResult } from '@main/providers/tools/result';
import { sendToMainWindow } from '@main/window';
import * as v from 'valibot';

const browserPromptGuideline =
  'Use browser tools only when the user includes @Browser, or while continuing that active @Browser task.';
const browserToolDefaults = {
  label: 'browser',
  promptGuidelines: [browserPromptGuideline]
};

const textResult = (text: string) => toolResult(text, null);

export const createBrowserTools = () => [
  defineTool({
    ...browserToolDefaults,
    async execute(_toolCallId, { url, newTab, tabId }) {
      const normalizedUrl = normalizeBrowserUrl(requiredString(url, 'URL'));
      if (!normalizedUrl) throw new Error('Enter a valid http, https, or local file URL.');

      const tabIdValue = tabId ? requiredString(tabId, 'tab id') : '';
      if (tabIdValue && !getBrowserStatus().tabs.some((tab) => tab.id === tabIdValue))
        throw new Error('Browser tab is not available. Read browser_status before retrying.');
      sendToMainWindow('app:browser-open-request', {
        url: normalizedUrl,
        ...(tabIdValue ? { tabId: tabIdValue, newTab: newTab === true } : { newTab: newTab !== false })
      });
      const status = await waitForBrowserOpen(normalizedUrl, tabIdValue);
      if (!status.open || !status.url) throw new Error('Browser did not open.');

      return textResult(`Opened ${normalizedUrl} in the in-app browser.`);
    },
    name: 'browser_open',
    parameters: browserOpenSchema,
    description: 'Open an HTTP, HTTPS, or local file URL in the browser panel for viewing or interaction.',
    promptSnippet: 'Open a page or local app in the browser.'
  }),
  defineTool({
    ...browserToolDefaults,
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
    promptSnippet: 'Select a tab returned by browser_status.'
  }),
  defineTool({
    ...browserToolDefaults,
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
    promptSnippet: 'Read the active browser tab and navigation state.'
  }),
  defineTool({
    ...browserToolDefaults,
    async execute(_toolCallId, { tabId }) {
      requireActiveTab(tabId);
      const result = goBackInBrowser();
      if (!result.ok) throw new Error(result.error ?? 'Could not go back in the browser.');
      return textResult('Went back in the in-app browser.');
    },
    name: 'browser_back',
    parameters: tabSchema,
    description: 'Go back one browser history entry.',
    promptSnippet: 'Go back after browser_status shows back history.'
  }),
  defineTool({
    ...browserToolDefaults,
    async execute(_toolCallId, { tabId }) {
      requireActiveTab(tabId);
      const result = goForwardInBrowser();
      if (!result.ok) throw new Error(result.error ?? 'Could not go forward in the browser.');
      return textResult('Went forward in the in-app browser.');
    },
    name: 'browser_forward',
    parameters: tabSchema,
    description: 'Go forward one browser history entry.',
    promptSnippet: 'Go forward after browser_status shows forward history.'
  }),
  defineTool({
    ...browserToolDefaults,
    async execute(_toolCallId, { tabId }) {
      requireActiveTab(tabId);
      const result = reloadBrowser();
      if (!result.ok) throw new Error(result.error ?? 'Could not reload the browser.');
      return textResult('Reloaded the in-app browser.');
    },
    name: 'browser_reload',
    parameters: tabSchema,
    description: 'Reload the current browser page.',
    promptSnippet: 'Refresh the active browser page after stale state.'
  }),
  defineTool({
    ...browserToolDefaults,
    async execute(_toolCallId, { tabId, ref }) {
      requireActiveTab(tabId);
      const refValue = requiredString(ref, 'element ref');
      const result = await clickInBrowser(refValue);
      if (!result.ok) throw new Error(result.error ?? 'Could not click the browser element.');
      return textResult(`Clicked browser element ${refValue}.`);
    },
    name: 'browser_click',
    parameters: browserClickSchema,
    description: 'Click an element ref from browser_snapshot.',
    promptSnippet: 'Click a ref returned by browser_snapshot.'
  }),
  defineTool({
    ...browserToolDefaults,
    async execute(_toolCallId, { tabId, ref, text, clear }) {
      requireActiveTab(tabId);
      const refValue = requiredString(ref, 'element ref');
      const textValue = v.parse(v.string('Enter a browser text value.'), text);
      const result = await typeInBrowser({ ref: refValue, text: textValue, clear: clear === true });
      if (!result.ok) throw new Error(result.error ?? 'Could not type into the browser element.');
      return textResult(`Typed into browser element ${refValue}.`);
    },
    name: 'browser_type',
    parameters: browserTypeSchema,
    description: 'Type text into an input ref from browser_snapshot.',
    promptSnippet: 'Type into an input ref returned by browser_snapshot.'
  }),
  defineTool({
    ...browserToolDefaults,
    async execute(_toolCallId, { tabId, direction, amount }) {
      requireActiveTab(tabId);
      const directionValue = v.parse(v.picklist(['up', 'down', 'left', 'right']), direction);
      const amountValue = v.parse(v.optional(v.pipe(v.number(), v.finite())), amount);
      const result = await scrollInBrowser(directionValue, amountValue);
      if (!result.ok) throw new Error(result.error ?? 'Could not scroll the browser page.');
      return textResult(`Scrolled the browser page ${direction}.`);
    },
    name: 'browser_scroll',
    parameters: browserScrollSchema,
    description: 'Scroll the browser page up, down, left, or right.',
    promptSnippet: 'Scroll the page to reveal content outside the viewport.'
  }),
  defineTool({
    ...browserToolDefaults,
    async execute(_toolCallId, { tabId, key }) {
      requireActiveTab(tabId);
      const keyValue = requiredString(key, 'key');
      const result = await pressInBrowser(keyValue);
      if (!result.ok) throw new Error(result.error ?? 'Could not press the browser key.');
      return textResult(`Pressed ${keyValue} in the browser.`);
    },
    name: 'browser_press',
    parameters: browserPressSchema,
    description: 'Press a supported key in the browser page.',
    promptSnippet: 'Press Enter, Tab, Escape, or arrow keys in the page.'
  }),
  defineTool({
    ...browserToolDefaults,
    async execute(_toolCallId, { tabId, detail }) {
      const status = requireActiveTab(tabId);
      const result = await readBrowserScreenshot(
        v.parse(v.optional(v.picklist(['standard', 'high']), 'standard'), detail)
      );
      if (!result.ok || !result.image) throw new Error(result.error ?? 'Could not capture the browser screenshot.');
      return toolImageResult(`Screenshot of ${status.url || 'the in-app browser'}.`, result.image);
    },
    parameters: screenshotSchema,
    name: 'browser_screenshot',
    description: 'Capture the visible browser page and return it as an image.',
    promptSnippet: 'Use screenshots for visual checks; prefer browser_snapshot for text.'
  }),
  defineTool({
    ...browserToolDefaults,
    async execute(_toolCallId, { tabId, width, height, reset }) {
      requireActiveTab(tabId);
      if (reset === true) {
        const cleared = await resetBrowserViewport();
        if (!cleared.ok) throw new Error(cleared.error ?? 'Could not reset the viewport size.');
        return textResult('Reset the browser viewport to the panel size.');
      }

      const widthValue = v.parse(v.pipe(v.number('Enter a browser viewport width, or pass reset.'), v.finite()), width);
      const heightValue = v.parse(v.optional(v.pipe(v.number(), v.finite())), height);
      const result = await resizeBrowserViewport(widthValue, heightValue);
      if (!result.ok) throw new Error(result.error ?? 'Could not emulate that viewport size.');
      const metrics = browserViewportMetrics(widthValue, heightValue);
      return textResult(
        `Emulating a ${metrics.width} × ${metrics.height} px browser viewport, centered and scaled to fit the panel.`
      );
    },
    name: 'browser_viewport',
    parameters: browserViewportSchema,
    description: 'Emulate a viewport size for responsive checks, or reset it.',
    promptSnippet: 'Emulate a viewport width before a responsive screenshot.'
  }),
  defineTool({
    ...browserToolDefaults,
    async execute(_toolCallId, { tabId }) {
      requireActiveTab(tabId);
      const result = await captureBrowserSnapshot();
      if (!result.ok || !result.snapshot) throw new Error(result.error ?? 'Could not read the browser page.');
      return textResult(JSON.stringify({ tabId, ...result.snapshot }));
    },
    parameters: tabSchema,
    name: 'browser_snapshot',
    description: 'Read page text, links, headings, and element refs.',
    promptSnippet: 'Read page text and refs for browser_click/browser_type.'
  })
];
