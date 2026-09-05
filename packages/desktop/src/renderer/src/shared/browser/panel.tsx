import type { BrowserActionResult, BrowserStatus } from '@preload/index';
import { BrowserButton } from '@renderer/shared/browser/button';
import type { BrowserNavigation } from '@renderer/shared/browser/navigation';
import { BrowserReloadIcon } from '@renderer/shared/browser/reload';
import { shouldCloseBrowserPanelForStatus } from '@renderer/shared/browser/status';
import { BrowserTabs } from '@renderer/shared/browser/tabs';
import { formatBrowserAddress } from '@renderer/shared/browser/url';
import { useBrowserBounds } from '@renderer/shared/browser/use-bounds';
import { useBrowserInspect } from '@renderer/shared/browser/use-inspect';
import { useBrowserScreenshot } from '@renderer/shared/browser/use-screenshot';
import { PanelCloseButton } from '@renderer/shared/panel/close';
import { usePanelMotion } from '@renderer/shared/panel/context';
import {
  BrowserEmptyIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ScreenshotIcon,
  SquareCursorIcon
} from '@renderer/ui/icons';
import { tw } from '@renderer/utils/tw';
import type { JSX } from 'preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

interface BrowserPanelProps {
  onClose: () => void;
  onUrlOpened: () => void;
  navigation: BrowserNavigation;
  onInspectText: (text: string) => void;
}

const emptyStatus: BrowserStatus = {
  url: '',
  open: false,
  title: '',
  loading: false,
  canGoBack: false,
  activeTabId: '',
  canGoForward: false,
  tabs: []
};

export const BrowserPanel = ({ onClose, navigation, onUrlOpened, onInspectText }: BrowserPanelProps) => {
  const mountedRef = useRef(true);
  const openRef = useRef(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const [address, setAddress] = useState('');
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<BrowserStatus>(emptyStatus);
  const activeTab = status.tabs.find((tab) => tab.id === status.activeTabId) ?? null;
  const active = Boolean(activeTab?.url || activeTab?.loading || navigation.url);
  const { moving: panelMoving } = usePanelMotion();
  const syncBounds = useBrowserBounds({ active, moving: panelMoving, viewportRef });
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

      const closePanel = shouldCloseBrowserPanelForStatus(openRef.current, nextStatus);
      openRef.current = nextStatus.open;

      if (closePanel) {
        onClose();
        return;
      }

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

  const openNewTab = useCallback(() => {
    window.pi.app
      .browserNewTab()
      .then((result) => {
        if (result.status) handleStatus(result.status);
      })
      .catch(() => setError('Browser tab could not be opened.'));
  }, [handleStatus]);

  const selectTab = useCallback(
    (tabId: string) => {
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
      window.pi.app
        .browserCloseTab(tabId)
        .then((result) => {
          if (result.status) handleStatus(result.status);
        })
        .catch(() => setError('Browser tab could not be closed.'));
    },
    [handleStatus]
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
      window.pi.app.browserClose().catch(() => {});
    },
    []
  );

  const inspectLabel = inspecting ? 'Stop annotating' : 'Annotate';
  const emptyMessage = error || 'Enter a URL to browse';
  const refreshLabel = status.loading ? 'Stop loading' : 'Refresh';
  const screenshotLabel = copied ? 'Copied' : 'Screenshot';

  return (
    <div class="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-canvas/95 text-ink backdrop-blur-xl dark:bg-canvas/90">
      <div class="flex h-10 min-w-0 shrink-0 items-center gap-0 border-b border-line px-2">
        <BrowserTabs
          tabs={status.tabs}
          activeId={status.activeTabId}
          onNew={openNewTab}
          onClose={closeTab}
          onSelect={selectTab}
        />
        <PanelCloseButton onClick={onClose} variant="toolbar" />
      </div>
      <div class="flex h-11 min-w-0 shrink-0 items-center gap-0 border-b border-line px-2">
        <BrowserButton label="Back" disabled={!status.canGoBack} onClick={goBack}>
          <ChevronLeftIcon class="size-4" />
        </BrowserButton>
        <BrowserButton label="Forward" disabled={!status.canGoForward} onClick={goForward}>
          <ChevronRightIcon class="size-4" />
        </BrowserButton>
        <BrowserButton label={refreshLabel} disabled={!status.url && !status.loading} onClick={reloadOrStop}>
          <BrowserReloadIcon loading={status.loading} />
        </BrowserButton>
        <form class="min-w-0 flex-1" onSubmit={submitAddress}>
          <input
            value={address}
            aria-label="URL"
            spellcheck={false}
            placeholder="Enter a URL"
            onBlur={() => setEditing(false)}
            onFocus={() => setEditing(true)}
            onInput={(event) => setAddress(event.currentTarget.value)}
            class="h-8 w-full border-0 bg-transparent px-2 text-xs leading-8 text-ink outline-0 placeholder:text-soft"
          />
        </form>
        <BrowserButton
          label={inspectLabel}
          active={inspecting}
          disabled={!status.url}
          onClick={toggleInspect}
          tooltipLabel={inspectLabel}
          tooltipSide="left"
        >
          <SquareCursorIcon class="size-4" strokeWidth={inspecting ? 2 : 1.5} />
        </BrowserButton>
        <BrowserButton
          label={screenshotLabel}
          disabled={!status.url}
          onClick={captureScreenshot}
          tooltipLabel={screenshotLabel}
          tooltipSide="left"
        >
          {copied ? <CheckIcon class="size-4" /> : <ScreenshotIcon class="size-4" strokeWidth={1.5} />}
        </BrowserButton>
      </div>
      <div ref={viewportRef} class="relative ml-0.5 min-h-0 min-w-0 flex-1 overflow-hidden">
        {(error || !active) && (
          <div class="absolute inset-0 grid place-items-center px-8 text-center">
            <div class="grid justify-items-center gap-3 text-soft">
              <BrowserEmptyIcon class="size-7" strokeWidth={1.5} />
              <p class={tw('max-w-64 text-sm leading-5', error && 'text-danger')}>{emptyMessage}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
