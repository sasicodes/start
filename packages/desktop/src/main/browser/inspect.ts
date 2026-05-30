import { inspectScript } from '@main/browser/inspect-script';
import { sendToRendererWindows } from '@main/window';
import type { WebContents } from 'electron';

interface BrowserActionResult {
  ok: boolean;
  error?: string;
}

const RELAY_PREFIX = '__startInspect__:';
const closedPanelError = 'Open the in-app browser panel first.';

const attached = new WeakSet<WebContents>();

interface InspectRelayMessage<TPayload = unknown> {
  event: string;
  payload: TPayload;
}

export const parseInspectRelay = <TPayload = unknown>(message: string): InspectRelayMessage<TPayload> | null => {
  if (!message.startsWith(RELAY_PREFIX)) return null;
  try {
    const parsed = JSON.parse(message.slice(RELAY_PREFIX.length)) as Partial<InspectRelayMessage<TPayload>>;
    if (typeof parsed?.event !== 'string') return null;
    return { event: parsed.event, payload: parsed.payload as TPayload };
  } catch {
    return null;
  }
};

const handleRelay = (message: InspectRelayMessage) => {
  if (message.event === 'mode-changed') {
    const payload = message.payload as { active?: boolean } | undefined;
    sendToRendererWindows('app:browser-inspect-state', Boolean(payload?.active));
    return;
  }

  if (message.event === 'annotations-sent') {
    const payload = message.payload as { text?: string } | undefined;
    if (payload?.text) sendToRendererWindows('app:browser-inspect-sent', payload.text);
  }
};

export const attachInspectListener = (webContents: WebContents) => {
  if (attached.has(webContents)) return;
  attached.add(webContents);
  webContents.on('console-message', (event) => {
    const parsed = parseInspectRelay(event.message);
    if (parsed) handleRelay(parsed);
  });
  webContents.on('did-start-navigation', (_event, _url, _inPlace, isMainFrame) => {
    if (isMainFrame) sendToRendererWindows('app:browser-inspect-state', false);
  });
};

const runInPage = async (webContents: WebContents, code: string): Promise<BrowserActionResult> => {
  try {
    await webContents.executeJavaScript(code, true);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Could not run the inspect overlay.' };
  }
};

export const startBrowserInspectIn = async (webContents: WebContents | null): Promise<BrowserActionResult> => {
  if (!webContents) return { ok: false, error: closedPanelError };
  attachInspectListener(webContents);
  return runInPage(
    webContents,
    `(() => { if (window.__startInspect__) { window.__startInspect__.activate(); return; } ${inspectScript} })();`
  );
};

export const stopBrowserInspectIn = async (webContents: WebContents | null): Promise<BrowserActionResult> => {
  if (!webContents) return { ok: false, error: closedPanelError };
  return runInPage(webContents, 'window.__startInspect__?.deactivate();');
};
