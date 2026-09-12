import type { BrowserActionResult, BrowserStatus } from '@preload/index';
import type { BrowserNavigation } from '@renderer/shared/browser/navigation';
import {
  closeBrowserSurface,
  closeNewTab,
  closePanelTab,
  completeNewTab,
  openNewTab,
  openReview,
  panelTabs,
  selectBrowser,
  syncBrowserTabs
} from '@renderer/shared/browser/state';
import { browserPanelTransition } from '@renderer/shared/browser/status';
import { formatBrowserAddress } from '@renderer/shared/browser/url';
import { useBrowserBounds } from '@renderer/shared/browser/use-bounds';
import { useBrowserInspect } from '@renderer/shared/browser/use-inspect';
import { useBrowserScreenshot } from '@renderer/shared/browser/use-screenshot';
import { usePanelMotion } from '@renderer/shared/panel/context';
import type { JSX } from 'preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

interface BrowserOptions {
  onClose: () => void;
  onUrlOpened: () => void;
  navigation: BrowserNavigation;
  onInspectText: (text: string) => void;
}

const emptyStatus: BrowserStatus = {
  url: '',
  tabs: [],
  title: '',
  open: false,
  loading: false,
  activeTabId: '',
  canGoBack: false,
  canGoForward: false
};

export const useBrowser = ({ onClose, navigation, onUrlOpened, onInspectText }: BrowserOptions) => {
  const mountedRef = useRef(true);
  const openRef = useRef(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const { selected } = panelTabs.value;
  const [error, setError] = useState('');
  const [address, setAddress] = useState('');
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<BrowserStatus>(emptyStatus);
  const activeTab = status.tabs.find((tab) => tab.id === status.activeTabId) ?? null;
  const active = Boolean(activeTab?.url || activeTab?.loading || navigation.url);
  const { moving: panelMoving } = usePanelMotion();
  const syncBounds = useBrowserBounds({ active: active && selected === 'browser', moving: panelMoving, viewportRef });
  const { inspecting, toggle: toggleInspect } = useBrowserInspect({ onText: onInspectText });
  const { copied, capture: captureScreenshot } = useBrowserScreenshot({ onError: setError });

  const applyStatus = useCallback(
    (nextStatus: BrowserStatus) => {
      if (!mountedRef.current) return;
      const nextTab = nextStatus.tabs.find((tab) => tab.id === nextStatus.activeTabId);
      setStatus(nextStatus);
      if (!editing) setAddress(formatBrowserAddress(nextTab?.url ?? ''));
    },
    [editing]
  );

  const handleStatus = useCallback(
    (nextStatus: BrowserStatus) => {
      if (!mountedRef.current) return;

      syncBrowserTabs(nextStatus.tabs.map((tab) => tab.id));
      const transition = browserPanelTransition(openRef.current, nextStatus, panelTabs.peek());
      openRef.current = nextStatus.open;

      if (transition === 'close') {
        onClose();
        return;
      }
      if (transition === 'review') openReview();
      if (transition === 'new') openNewTab();

      applyStatus(nextStatus);
    },
    [applyStatus, onClose]
  );

  const openAddress = useCallback(
    async (value: string, newTab = false, tabId = '') => {
      const next = value.trim();
      if (!next) {
        setError('');
        setAddress('');
        return;
      }

      setError('');
      await syncBounds();
      if (!mountedRef.current) return;

      const result: BrowserActionResult = await window.pi.app
        .browserOpen(value, { newTab, ...(tabId ? { tabId } : {}) })
        .catch(() => ({
          ok: false,
          error: 'This site cannot be loaded.'
        }));
      if (!mountedRef.current) return;

      if (!result.ok) {
        setError(result.error ?? 'This site cannot be loaded.');
        return;
      }

      setError('');
      if (result.status) handleStatus(result.status);
    },
    [handleStatus, syncBounds]
  );

  const submitAddress = useCallback(
    (event: JSX.TargetedSubmitEvent<HTMLFormElement>) => {
      event.preventDefault();
      openAddress(address).catch(() => {});
    },
    [address, openAddress]
  );

  const goBack = useCallback(() => {
    window.pi.app.browserBack().then((result) => result.status && handleStatus(result.status));
  }, [handleStatus]);

  const goForward = useCallback(() => {
    window.pi.app.browserForward().then((result) => result.status && handleStatus(result.status));
  }, [handleStatus]);

  const reloadOrStop = useCallback(() => {
    const action = status.loading ? window.pi.app.browserStop : window.pi.app.browserReload;
    action().then((result) => result.status && handleStatus(result.status));
  }, [handleStatus, status.loading]);

  const createBrowserTab = useCallback(async () => {
    try {
      const result = await window.pi.app.browserNewTab();
      if (!mountedRef.current) return;
      if (!result.ok || !result.status) {
        setError('Browser tab could not be opened.');
        return;
      }
      completeNewTab(result.status.activeTabId);
      handleStatus(result.status);
    } catch {
      setError('Browser tab could not be opened.');
    }
  }, [handleStatus]);

  const selectTab = useCallback(
    (tabId: string) => {
      if (tabId === 'new') {
        openNewTab();
        return;
      }
      if (tabId === 'review') {
        openReview();
        return;
      }
      selectBrowser();
      window.pi.app
        .browserSelectTab(tabId)
        .then((result) => {
          if (result.status) handleStatus(result.status);
        })
        .catch(() => setError('Browser tab could not be selected.'));
    },
    [handleStatus]
  );

  const closeTab = useCallback(
    (tabId: string) => {
      if (tabId === 'new' || tabId === 'review') {
        if (closePanelTab(tabId, status.tabs.length > 0) === 'close') onClose();
        return;
      }
      if (!tabId) {
        if (closeBrowserSurface() === 'close') onClose();
        return;
      }
      window.pi.app
        .browserCloseTab(tabId)
        .then((result) => {
          if (result.status) handleStatus(result.status);
        })
        .catch(() => setError('Browser tab could not be closed.'));
    },
    [handleStatus, onClose, status.tabs.length]
  );

  useEffect(() => {
    window.pi.app
      .browserStatus()
      .then(handleStatus)
      .catch(() => {});
    return window.pi.app.onBrowserStatus(handleStatus);
  }, [handleStatus]);

  useEffect(() => {
    if (navigation.tabId && !navigation.url) {
      selectTab(navigation.tabId);
      onUrlOpened();
      return;
    }

    if (!navigation.url) return;
    setAddress(formatBrowserAddress(navigation.url));
    openAddress(navigation.url, navigation.newTab, navigation.tabId).catch(() => {});
    onUrlOpened();
  }, [navigation.id, navigation.newTab, navigation.tabId, navigation.url, onUrlOpened, openAddress, selectTab]);

  useEffect(
    () => () => {
      mountedRef.current = false;
      closeNewTab(false);
      window.pi.app.browserClose().catch(() => {});
    },
    []
  );

  useEffect(() => {
    if (selected !== 'browser') window.pi.app.browserInspectStop().catch(() => {});
  }, [selected]);

  const focusedTabId = selected === 'browser' ? status.activeTabId : selected;

  useEffect(() => window.pi.app.onClosePanelTab(() => closeTab(focusedTabId)), [closeTab, focusedTabId]);

  return {
    error,
    active,
    status,
    copied,
    address,
    selected,
    inspecting,
    viewportRef,

    goBack,
    closeTab,
    selectTab,
    goForward,
    setAddress,
    setEditing,
    reloadOrStop,
    submitAddress,
    toggleInspect,
    captureScreenshot,
    createBrowserTab
  };
};
