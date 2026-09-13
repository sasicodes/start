import { getBrowserStatus } from '@main/browser/index';
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

export const waitForBrowserSelection = async (tabId: string) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < openTimeoutMs) {
    const status = getBrowserStatus();
    if (status.open && status.activeTabId === tabId) return status;
    await wait(openPollMs);
  }

  return getBrowserStatus();
};
