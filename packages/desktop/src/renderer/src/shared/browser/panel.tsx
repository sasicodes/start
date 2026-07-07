import type { BrowserActionResult, BrowserStatus, BrowserTabStatus } from '@preload/index';
import { BrowserButton } from '@renderer/shared/browser/button';
import type { BrowserNavigation } from '@renderer/shared/browser/navigation';
import { BrowserReloadIcon } from '@renderer/shared/browser/reload';
import { formatBrowserAddress } from '@renderer/shared/browser/url';
import { useBrowserBounds } from '@renderer/shared/browser/use-bounds';
import { useBrowserInspect } from '@renderer/shared/browser/use-inspect';
import { useBrowserScreenshot } from '@renderer/shared/browser/use-screenshot';
import { shouldCloseBrowserPanelForStatus } from '@renderer/shared/browser/status';
import { PanelCloseButton } from '@renderer/shared/panel/close';
import { usePanelMotion } from '@renderer/shared/panel/context';
import {
  BrowserEmptyIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  ScreenshotIcon,
  SquareCursorIcon,
  XIcon
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

const tabLabel = (tab: BrowserTabStatus) => {
  if (tab.title.trim()) return tab.title.trim();
  if (!tab.url) return 'New tab';

  try {
    return new URL(tab.url).hostname;
  } catch {
    return tab.url;
  }
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
  const visibleTabs = status.tabs.length > 0 ? status.tabs : [{ id: 'empty', url: '', title: '', loading: false }];

  return (
    <div class="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-canvas/95 text-ink backdrop-blur-xl dark:bg-canvas/90">
      <div class="flex h-10 min-w-0 shrink-0 items-center gap-0 border-b border-line px-2">
        <div
          role="tablist"
          aria-label="Browser tabs"
          class="no-scroll-bar flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto overflow-y-hidden"
        >
          {visibleTabs.map((tab) => {
            const selected = tab.id === status.activeTabId || !status.activeTabId;
            const label = tabLabel(tab);

            return (
              <div key={tab.id} class="group relative h-7 min-w-0 max-w-52 flex-none">
                <button
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  title={label}
                  onClick={() => {
                    if (tab.id !== 'empty') selectTab(tab.id);
                  }}
                  class={tw(
                    'flex h-7 w-full min-w-0 items-center gap-1.5 rounded-lg border border-line bg-transparent px-3 py-0 text-left text-xs leading-7 font-medium outline-0 transition-colors',
                    selected ? 'text-ink' : 'text-soft hover:text-ink focus-visible:text-ink'
                  )}
                >
                  <span class="relative grid size-4 flex-none place-items-center">
                    <BrowserEmptyIcon
                      class={tw(
                        'size-3.5 text-soft/75 transition-opacity',
                        tab.id !== 'empty' && 'group-hover:opacity-0 group-focus-within:opacity-0'
                      )}
                      strokeWidth={1.25}
                    />
                  </span>
                  <span class="min-w-0 truncate">{label}</span>
                </button>
                {tab.id !== 'empty' && (
                  <button
                    type="button"
                    aria-label={`Close ${label}`}
                    title="Close tab"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      closeTab(tab.id);
                    }}
                    class="group/close absolute top-1/2 left-2.5 grid size-5 -translate-y-1/2 place-items-center border-0 bg-transparent p-0 text-soft opacity-0 outline-0 transition-[color,opacity] group-hover:opacity-100 group-focus-within:opacity-100 hover:text-ink focus-visible:text-ink [&_svg]:size-3"
                  >
                    <span class="grid size-4 place-items-center rounded-full transition-colors group-hover/close:bg-ink/20 group-focus-visible/close:bg-ink/20">
                      <XIcon strokeWidth={1.5} />
                    </span>
                  </button>
                )}
              </div>
            );
          })}
          <button
            type="button"
            aria-label="New tab"
            title="New tab"
            onClick={openNewTab}
            class="relative grid size-7 flex-none place-items-center rounded-md border-0 bg-transparent p-0 text-soft outline-0 transition-colors before:absolute before:-inset-1 before:content-[''] hover:text-ink focus-visible:text-ink [&_svg]:size-4"
          >
            <PlusIcon strokeWidth={1.5} />
          </button>
        </div>
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
      <div ref={viewportRef} class="relative min-h-0 min-w-0 flex-1 overflow-hidden">
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
