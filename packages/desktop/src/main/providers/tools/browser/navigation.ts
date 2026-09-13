import { type BrowserStatus, getBrowserStatus } from '@main/browser/index';
import { wait } from '@main/browser/utils/wait';
import * as v from 'valibot';

const openPollMs = 100;
const openTimeoutMs = 5000;

const browserStringSchema = (label: string) =>
  v.pipe(v.string(), v.trim(), v.minLength(1, `Enter a browser ${label}.`));

export const requiredString = (value: unknown, label: string) => {
  const result = v.safeParse(browserStringSchema(label), value);
  if (result.success) return result.output;
  throw new Error(`Enter a browser ${label}.`);
};

export const requireActiveTab = (value: unknown) => {
  const tabId = requiredString(value, 'tab id');
  const status = getBrowserStatus();
  if (!status.open || status.activeTabId !== tabId)
    throw new Error('Browser tab is not active. Read browser_status and select the intended tab before retrying.');
  return status;
};

export const browserOpenSettled = (
  status: BrowserStatus,
  expectedUrl: string,
  initialUrl: string,
  sawLoading: boolean
): boolean => {
  if (!status.open) return false;
  if (status.url === expectedUrl) return true;
  if (status.loading || !status.url) return false;
  return sawLoading || status.url !== initialUrl;
};

export const waitForBrowserOpen = async (expectedUrl: string, tabId = '') => {
  const startedAt = Date.now();
  const initialUrl = getBrowserStatus().url;
  let sawLoading = false;

  while (Date.now() - startedAt < openTimeoutMs) {
    const status = getBrowserStatus();
    const targeted = !tabId || status.activeTabId === tabId;
    if (targeted && browserOpenSettled(status, expectedUrl, initialUrl, sawLoading)) return status;
    sawLoading = sawLoading || (targeted && status.loading);
    await wait(openPollMs);
  }

  throw new Error('Browser navigation timed out. Check browser_status before retrying.');
};

export const waitForBrowserSelection = async (tabId: string) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < openTimeoutMs) {
    const status = getBrowserStatus();
    if (status.open && status.activeTabId === tabId) return status;
    await wait(openPollMs);
  }

  return getBrowserStatus();
};
