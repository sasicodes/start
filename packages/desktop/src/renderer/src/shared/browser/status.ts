import type { BrowserStatus } from '@preload/index';

export const shouldCloseBrowserPanelForStatus = (wasOpen: boolean, nextStatus: BrowserStatus) =>
  wasOpen && !nextStatus.open;
