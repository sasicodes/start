export type ScreenshotDetail = 'standard' | 'high';

export const screenshotSize = (width: number, height: number, detail: ScreenshotDetail) => {
  const limit = detail === 'high' ? 2048 : 1024;
  const scale = Math.min(1, limit / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
};
