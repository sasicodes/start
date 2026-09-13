import { sendCdp } from '@main/browser/cdp';
import type { WebContents } from 'electron';

export interface BrowserViewportMetrics {
  width: number;
  height: number;
}

const minViewport = 240;
const maxViewport = 4000;
const defaultHeight = 900;

export const browserViewportMetrics = (width: number, height?: number): BrowserViewportMetrics => ({
  width: Math.round(Math.min(maxViewport, Math.max(minViewport, width))),
  height: Math.round(
    Math.min(maxViewport, Math.max(minViewport, Number.isFinite(height) ? Number(height) : defaultHeight))
  )
});

export const setBrowserViewport = async (webContents: WebContents, metrics: BrowserViewportMetrics) => {
  const result = await sendCdp(webContents, 'Emulation.setDeviceMetricsOverride', {
    mobile: false,
    width: metrics.width,
    height: metrics.height,
    deviceScaleFactor: 0
  });
  return result !== null;
};

export const clearBrowserViewport = async (webContents: WebContents) => {
  const result = await sendCdp(webContents, 'Emulation.clearDeviceMetricsOverride');
  return result !== null;
};

export const captureViewportPng = async (webContents: WebContents): Promise<Buffer | null> => {
  const result = await sendCdp(webContents, 'Page.captureScreenshot', { format: 'png' });
  if (!result || typeof result !== 'object') return null;

  const { data } = result as Record<string, unknown>;
  if (typeof data !== 'string' || !data) return null;
  return Buffer.from(data, 'base64');
};
