import { cursorScript } from '@main/browser/cursor/script';
import type { WebContents } from 'electron';

export const withBrowserCursor = (body: string): string => `
(async () => {
  ${cursorScript}
  ${body}
})()
`;

export const hideBrowserCursor = (webContents: WebContents) => {
  if (webContents.isDestroyed()) return;
  webContents.executeJavaScript('window.__startCursor__?.hide();', true).catch(() => {});
};
