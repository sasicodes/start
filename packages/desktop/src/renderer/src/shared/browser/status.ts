import type { BrowserStatus } from '@preload/index';
import type { PanelTabs } from '@renderer/shared/browser/state';

export const browserPanelTransition = (wasOpen: boolean, nextStatus: BrowserStatus, tabs: PanelTabs) => {
  if (!wasOpen || nextStatus.open) return 'keep';
  if (!tabs.review && !tabs.choosing) return 'close';
  if (tabs.selected !== 'browser') return 'keep';
  return tabs.review ? 'review' : 'new';
};
