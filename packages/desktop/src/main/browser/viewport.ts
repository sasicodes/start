import { sendCdp } from '@main/browser/cdp';
import type { WebContents } from 'electron';

export interface BrowserViewportMetrics {
  width: number;
  height: number;
}

const previewScales = new WeakMap<WebContents, number>();

export const browserInputPoint = (webContents: WebContents, point: { x: number; y: number }) => {
  const scale = previewScales.get(webContents) ?? 1;
  return { x: point.x * scale, y: point.y * scale };
};

const minViewport = 240;
const maxViewport = 4000;
const defaultHeight = 900;

export const browserViewportMetrics = (width: number, height?: number): BrowserViewportMetrics => ({
  width: Math.round(Math.min(maxViewport, Math.max(minViewport, width))),
  height: Math.round(
    Math.min(maxViewport, Math.max(minViewport, Number.isFinite(height) ? Number(height) : defaultHeight))
  )
});

export const fitBrowserViewport = (
  bounds: { x: number; y: number; width: number; height: number },
  metrics: BrowserViewportMetrics
) => {
  const scale = Math.min(1, bounds.width / metrics.width, bounds.height / metrics.height);
  const width = Math.max(1, Math.floor(metrics.width * scale));
  const height = Math.max(1, Math.floor(metrics.height * scale));
  return {
    scale,
    bounds: {
      x: bounds.x + Math.floor((bounds.width - width) / 2),
      y: bounds.y + Math.floor((bounds.height - height) / 2),
      width,
      height
    }
  };
};

export const setBrowserViewport = (webContents: WebContents, metrics: BrowserViewportMetrics, scale = 1) => {
  if (webContents.isDestroyed()) return false;
  try {
    webContents.enableDeviceEmulation({
      screenPosition: 'desktop',
      screenSize: metrics,
      viewSize: metrics,
      viewPosition: { x: 0, y: 0 },
      deviceScaleFactor: 0,
      scale
    });
    previewScales.set(webContents, scale);
    return true;
  } catch {
    return false;
  }
};

export const clearBrowserViewport = (webContents: WebContents) => {
  if (webContents.isDestroyed()) return false;
  try {
    webContents.disableDeviceEmulation();
    previewScales.delete(webContents);
    return true;
  } catch {
    return false;
  }
};

export const captureViewportPng = async (webContents: WebContents): Promise<Buffer | null> => {
  const result = await sendCdp(webContents, 'Page.captureScreenshot', { format: 'png' });
  if (!result || typeof result !== 'object') return null;

  const { data } = result as Record<string, unknown>;
  if (typeof data !== 'string' || !data) return null;
  return Buffer.from(data, 'base64');
};
