import { browserElementsScript } from '@main/browser/elements';
import { withTimeout } from '@main/browser/timeout';
import type { WebContents } from 'electron';

export interface BrowserSnapshotHeading {
  text: string;
  level: number;
}

export interface BrowserSnapshotLink {
  url: string;
  text: string;
}

export interface BrowserSnapshotElement {
  ref: string;
  tag: string;
  text: string;
  role: string;
  label: string;
  disabled: boolean;
}

export interface BrowserSnapshot {
  url: string;
  text: string;
  title: string;
  links: BrowserSnapshotLink[];
  elements: BrowserSnapshotElement[];
  headings: BrowserSnapshotHeading[];
}

const loadTimeoutMs = 8000;
const snapshotTimeoutMs = 3000;

const snapshotScript = `
(() => {
  ${browserElementsScript}
  const maxLinkCount = 100;
  const maxTextLength = 10000;
  const maxHeadingCount = 60;
  const maxSnippetLength = 240;
  const normalize = (value) => String(value ?? '').replace(/\\s+/g, ' ').trim();
  const truncate = (value, length) => normalize(value).slice(0, length);
  const linkText = (element) => element.textContent || element.getAttribute('aria-label') || element.href;
  const elementText = (element) =>
    element.getAttribute('aria-label') ||
    element.getAttribute('placeholder') ||
    element.textContent ||
    element.getAttribute('name') ||
    element.getAttribute('title') ||
    '';

  const headings = Array.from(document.querySelectorAll('h1, h2, h3'), (element) => ({
    text: truncate(element.textContent, maxSnippetLength),
    level: Number(element.tagName.slice(1))
  })).filter((heading) => heading.text.length > 0).slice(0, maxHeadingCount);

  const links = Array.from(document.querySelectorAll('a[href]'), (element) => ({
    url: element.href,
    text: truncate(linkText(element), maxSnippetLength)
  })).filter((link) => link.url && link.text.length > 0).slice(0, maxLinkCount);

  const elements = browserElements().map((element, index) => ({
    ref: 'e' + (index + 1),
    tag: element.tagName.toLowerCase(),
    role: normalize(element.getAttribute('role') || element.tagName.toLowerCase()),
    label: truncate(element.getAttribute('aria-label') || element.getAttribute('placeholder') || '', maxSnippetLength),
    text: truncate(elementText(element), maxSnippetLength),
    disabled: Boolean(element.disabled || element.getAttribute('aria-disabled') === 'true')
  }));

  return {
    url: window.location.href,
    title: document.title,
    links,
    elements,
    headings,
    text: truncate(document.body ? document.body.innerText : '', maxTextLength)
  };
})()
`;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const stringValue = (value: unknown): string => (typeof value === 'string' ? value : '');

const numberValue = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0);

const parseHeadings = (value: unknown): BrowserSnapshotHeading[] => {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!isRecord(item)) return [];

    const text = stringValue(item.text);
    const level = numberValue(item.level);
    if (!text || level < 1) return [];

    return [{ text, level }];
  });
};

const parseLinks = (value: unknown): BrowserSnapshotLink[] => {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!isRecord(item)) return [];

    const url = stringValue(item.url);
    const text = stringValue(item.text);
    if (!url || !text) return [];

    return [{ url, text }];
  });
};

const parseElements = (value: unknown): BrowserSnapshotElement[] => {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!isRecord(item)) return [];

    const ref = stringValue(item.ref);
    const tag = stringValue(item.tag);
    const text = stringValue(item.text);
    const role = stringValue(item.role);
    const label = stringValue(item.label);
    const disabled = typeof item.disabled === 'boolean' ? item.disabled : false;
    if (!ref || !tag) return [];

    return [{ ref, tag, text, role, label, disabled }];
  });
};

export const parseBrowserSnapshot = (value: unknown): BrowserSnapshot | null => {
  if (!isRecord(value)) return null;

  return {
    url: stringValue(value.url),
    text: stringValue(value.text),
    title: stringValue(value.title),
    links: parseLinks(value.links),
    elements: parseElements(value.elements),
    headings: parseHeadings(value.headings)
  };
};

const waitForLoad = async (webContents: WebContents): Promise<void> => {
  if (!webContents.isLoading()) return;

  await new Promise<void>((resolve) => {
    const done = () => {
      clearTimeout(timer);
      webContents.removeListener('did-stop-loading', done);
      resolve();
    };
    const timer = setTimeout(done, loadTimeoutMs);
    webContents.once('did-stop-loading', done);
  });
};

export const readBrowserSnapshot = async (webContents: WebContents): Promise<BrowserSnapshot | null> => {
  await waitForLoad(webContents);
  try {
    const snapshot = await withTimeout(webContents.executeJavaScript(snapshotScript), snapshotTimeoutMs);
    return parseBrowserSnapshot(snapshot);
  } catch {
    return null;
  }
};
