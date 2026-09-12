import { signal } from '@preact/signals';

type TabKind = 'browser' | 'review' | 'new';
type PanelTabClose = 'keep' | 'close';

export interface PanelTabs {
  review: boolean;
  choosing: boolean;
  selected: TabKind;
}

export const panelTabs = signal<PanelTabs>({ review: false, choosing: false, selected: 'browser' });

export const panelTabOrder = signal<string[]>([]);

const appendTab = (id: string) => {
  if (!panelTabOrder.peek().includes(id)) panelTabOrder.value = [...panelTabOrder.peek(), id];
};

export const syncBrowserTabs = (ids: string[]) => {
  const current = panelTabOrder.peek();
  const next = current.filter((id) => id === 'review' || id === 'new' || ids.includes(id));
  next.push(...ids.filter((id) => !next.includes(id)));
  if (next.length !== current.length || next.some((id, index) => id !== current[index])) panelTabOrder.value = next;
};

export const completeNewTab = (id: string) => {
  const current = panelTabOrder.peek();
  const existingReview = id === 'review' && current.includes(id);
  const next = existingReview
    ? current.filter((key) => key !== 'new')
    : current.filter((key) => key !== id).map((key) => (key === 'new' ? id : key));
  if (!next.includes(id)) next.push(id);
  panelTabOrder.value = next;
  panelTabs.value = {
    ...panelTabs.peek(),
    choosing: false,
    selected: id === 'review' ? 'review' : 'browser',
    review: id === 'review' || panelTabs.peek().review
  };
};

export const openReview = () => {
  appendTab('review');
  panelTabs.value = { ...panelTabs.peek(), review: true, selected: 'review' };
};

export const selectBrowser = () => {
  panelTabs.value = { ...panelTabs.peek(), selected: 'browser' };
};

export const openNewTab = () => {
  appendTab('new');
  panelTabs.value = { ...panelTabs.peek(), choosing: true, selected: 'new' };
};

export const closeNewTab = (hasBrowser: boolean) => {
  panelTabOrder.value = panelTabOrder.peek().filter((id) => id !== 'new');
  const current = panelTabs.peek();
  const selected = hasBrowser || !current.review ? 'browser' : 'review';
  panelTabs.value = { ...current, choosing: false, selected: current.selected === 'new' ? selected : current.selected };
};

export const closeReview = () => {
  panelTabOrder.value = panelTabOrder.peek().filter((id) => id !== 'review');
  const current = panelTabs.peek();
  const selected = current.choosing ? 'new' : 'browser';
  panelTabs.value = {
    ...current,
    review: false,
    selected: current.selected === 'review' ? selected : current.selected
  };
};

export const closePanelTab = (id: 'review' | 'new', hasBrowser: boolean): PanelTabClose => {
  if (id === 'review') closeReview();
  else closeNewTab(hasBrowser);
  const { review, choosing } = panelTabs.peek();
  return hasBrowser || review || choosing ? 'keep' : 'close';
};

export const closeBrowserSurface = (): PanelTabClose => {
  const current = panelTabs.peek();
  if (!current.review && !current.choosing) return 'close';

  panelTabs.value = { ...current, selected: current.review ? 'review' : 'new' };
  return 'keep';
};
