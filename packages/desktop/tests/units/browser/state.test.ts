import {
  closeBrowserSurface,
  closeNewTab,
  closePanelTab,
  closeReview,
  completeNewTab,
  openNewTab,
  openReview,
  panelTabOrder,
  panelTabs,
  selectBrowser,
  syncBrowserTabs
} from '@renderer/shared/browser/state';
import { browserPanelTransition } from '@renderer/shared/browser/status';
import { beforeEach, describe, expect, it } from 'vitest';

beforeEach(() => {
  panelTabOrder.value = [];
  panelTabs.value = { review: false, choosing: false, selected: 'browser' };
});

describe('browser and review tabs', () => {
  it('opens a chooser without replacing the review tab', () => {
    openReview();
    openNewTab();
    expect(panelTabs.value).toEqual({ review: true, choosing: true, selected: 'new' });
    selectBrowser();
    expect(panelTabs.value).toEqual({ review: true, choosing: true, selected: 'browser' });
    openNewTab();
    closeNewTab(false);
    expect(panelTabs.value).toEqual({ review: true, choosing: false, selected: 'review' });
  });

  it('reuses review instead of adding duplicate review tabs', () => {
    openReview();
    openNewTab();
    closeNewTab(false);
    openReview();
    expect(panelTabs.value).toEqual({ review: true, choosing: false, selected: 'review' });
  });

  it('returns to the browser after closing a chooser when browser tabs exist', () => {
    openReview();
    openNewTab();
    closeNewTab(true);
    expect(panelTabs.value).toEqual({ review: true, choosing: false, selected: 'browser' });
  });

  it('preserves the active tab when closing a background chooser or review', () => {
    openNewTab();
    openReview();
    closeNewTab(true);
    expect(panelTabs.value.selected).toBe('review');
    openNewTab();
    closeReview();
    expect(panelTabs.value).toEqual({ review: false, choosing: true, selected: 'new' });
  });

  it('falls back to the chooser or browser after closing the selected review', () => {
    openNewTab();
    openReview();
    closeReview();
    expect(panelTabs.value.selected).toBe('new');
    closeNewTab(true);
    openReview();
    closeReview();
    expect(panelTabs.value).toEqual({ review: false, choosing: false, selected: 'browser' });
  });

  it.each([
    [false, false, 'browser', 'close'],
    [true, false, 'browser', 'review'],
    [false, true, 'browser', 'new'],
    [true, true, 'browser', 'review'],
    [true, false, 'review', 'keep'],
    [false, true, 'new', 'keep']
  ] as const)(
    'handles the last browser closing with review=%s chooser=%s selected=%s',
    (review, choosing, selected, expected) => {
      const status = {
        open: false,
        url: '',
        title: '',
        tabs: [],
        activeTabId: '',
        loading: false,
        canGoBack: false,
        canGoForward: false
      };
      const tabs = { review, choosing, selected };
      expect(browserPanelTransition(true, status, tabs)).toBe(expected);
      expect(browserPanelTransition(false, status, tabs)).toBe('keep');
      expect(browserPanelTransition(true, { ...status, open: true }, tabs)).toBe('keep');
    }
  );
});

describe('combined tab order', () => {
  it('keeps Review first when subsequent choosers become browser tabs', () => {
    openReview();
    openNewTab();
    syncBrowserTabs(['a']);
    completeNewTab('a');
    openNewTab();
    syncBrowserTabs(['a', 'b']);
    completeNewTab('b');
    expect(panelTabOrder.value).toEqual(['review', 'a', 'b']);
    expect(panelTabs.value.selected).toBe('browser');
    expect(panelTabs.value.choosing).toBe(false);
  });

  it('replaces a chooser in place even when another tab opens after it', () => {
    syncBrowserTabs(['a']);
    openNewTab();
    openReview();
    syncBrowserTabs(['a', 'b']);
    completeNewTab('b');
    expect(panelTabOrder.value).toEqual(['a', 'b', 'review']);
  });

  it('retains mixed order during status updates and removes closed browsers', () => {
    syncBrowserTabs(['a']);
    openReview();
    syncBrowserTabs(['a', 'b']);
    syncBrowserTabs(['b', 'a']);
    expect(panelTabOrder.value).toEqual(['a', 'review', 'b']);
    syncBrowserTabs(['b']);
    expect(panelTabOrder.value).toEqual(['review', 'b']);
    closeReview();
    openReview();
    expect(panelTabOrder.value).toEqual(['b', 'review']);
  });

  it('replaces the chooser with Review and preserves an existing Review position', () => {
    syncBrowserTabs(['a']);
    openNewTab();
    completeNewTab('review');
    expect(panelTabOrder.value).toEqual(['a', 'review']);
    syncBrowserTabs(['a', 'b']);
    openNewTab();
    completeNewTab('review');
    expect(panelTabOrder.value).toEqual(['a', 'review', 'b']);
    expect(panelTabs.value.selected).toBe('review');
    expect(panelTabs.value.choosing).toBe(false);
  });

  it('does not duplicate tabs on repeated selection and removes a closed chooser', () => {
    openReview();
    openNewTab();
    openReview();
    openNewTab();
    expect(panelTabOrder.value).toEqual(['review', 'new']);
    closeNewTab(false);
    expect(panelTabOrder.value).toEqual(['review']);
  });
});

describe('closing panel tabs', () => {
  it.each(['review', 'new'] as const)('closes the panel when %s is the last tab', (id) => {
    if (id === 'review') openReview();
    else openNewTab();
    expect(closePanelTab(id, false)).toBe('close');
    expect(panelTabOrder.value).toEqual([]);
    expect(panelTabs.value).toEqual({ review: false, choosing: false, selected: 'browser' });
  });

  it.each(['review', 'new'] as const)('keeps the panel open when a browser remains after closing %s', (id) => {
    if (id === 'review') openReview();
    else openNewTab();
    expect(closePanelTab(id, true)).toBe('keep');
    expect(panelTabs.value.selected).toBe('browser');
  });

  it('keeps the remaining Review or chooser tab visible', () => {
    openReview();
    openNewTab();
    expect(closePanelTab('new', false)).toBe('keep');
    expect(panelTabs.value.selected).toBe('review');
    openNewTab();
    expect(closePanelTab('review', false)).toBe('keep');
    expect(panelTabs.value.selected).toBe('new');
  });

  it('closes the panel when the empty browser surface is the last tab', () => {
    expect(closeBrowserSurface()).toBe('close');
    expect(panelTabs.value.selected).toBe('browser');
  });

  it('falls back to Review or the chooser when the empty browser surface closes', () => {
    openReview();
    selectBrowser();
    expect(closeBrowserSurface()).toBe('keep');
    expect(panelTabs.value.selected).toBe('review');

    closeReview();
    openNewTab();
    selectBrowser();
    expect(closeBrowserSurface()).toBe('keep');
    expect(panelTabs.value.selected).toBe('new');
  });
});
