import { inspectScript } from '@main/browser/inspect/script';
import { sendToRendererWindows } from '@main/window';
import type { WebContents } from 'electron';

interface InspectResult {
  ok: boolean;
  error?: string;
}

interface InspectRelay<TPayload = unknown> {
  event: string;
  payload: TPayload;
}

const relayPrefix = '__startInspect__:';
const noPanelError = 'Open the in-app browser panel first.';
const instrumented = new WeakSet<WebContents>();

export const parseInspectRelay = <TPayload = unknown>(message: string): InspectRelay<TPayload> | null => {
  if (!message.startsWith(relayPrefix)) return null;
  try {
    const parsed = JSON.parse(message.slice(relayPrefix.length)) as Partial<InspectRelay<TPayload>>;
    if (typeof parsed?.event !== 'string') return null;
    return { event: parsed.event, payload: parsed.payload as TPayload };
  } catch {
    return null;
  }
};

const routeRelay = (message: InspectRelay) => {
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
  if (instrumented.has(webContents)) return;
  instrumented.add(webContents);
  webContents.on('console-message', (event) => {
    const parsed = parseInspectRelay(event.message);
    if (parsed) routeRelay(parsed);
  });
  webContents.on('did-start-navigation', (_event, _url, _inPlace, isMainFrame) => {
    if (isMainFrame) sendToRendererWindows('app:browser-inspect-state', false);
  });
};

const runInPage = async (webContents: WebContents, code: string): Promise<InspectResult> => {
  try {
    await webContents.executeJavaScript(code, true);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Could not run the inspect overlay.' };
  }
};

export const startInspect = async (webContents: WebContents | null): Promise<InspectResult> => {
  if (!webContents) return { ok: false, error: noPanelError };
  attachInspectListener(webContents);
  return runInPage(
    webContents,
    `(() => { if (window.__startInspect__) { window.__startInspect__.activate(); return; } ${inspectScript} })();`
  );
};

export const stopInspect = async (webContents: WebContents | null): Promise<InspectResult> => {
  if (!webContents) return { ok: false, error: noPanelError };
  return runInPage(webContents, 'window.__startInspect__?.deactivate();');
};
