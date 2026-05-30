import { parseInspectRelay, routeInspectRelay } from '@main/browser/inspect/relay';
import { inspectScript } from '@main/browser/inspect/script';
import { sendToRendererWindows } from '@main/window';
import type { WebContents } from 'electron';

interface InspectResult {
  ok: boolean;
  error?: string;
}

const noPanelError = 'Open the in-app browser panel first.';
const instrumented = new WeakSet<WebContents>();

export const attachInspectListener = (webContents: WebContents) => {
  if (instrumented.has(webContents)) return;
  instrumented.add(webContents);
  webContents.on('console-message', (event) => {
    const relay = parseInspectRelay(event.message);
    if (relay) routeInspectRelay(relay);
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
