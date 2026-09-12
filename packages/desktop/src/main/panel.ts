import type { BrowserWindow as ElectronBrowserWindow, WebContents } from 'electron';

const openPanels = new WeakSet<WebContents>();

export const setSidePanelOpen = (sender: WebContents, open: boolean) => {
  if (open) openPanels.add(sender);
  else openPanels.delete(sender);
};

export const closeSidePanelTab = (window: ElectronBrowserWindow): boolean => {
  if (!openPanels.has(window.webContents)) return false;

  window.webContents.send('app:close-panel-tab');
  return true;
};
