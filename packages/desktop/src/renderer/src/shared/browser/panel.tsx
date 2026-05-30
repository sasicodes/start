import type { BrowserActionResult, BrowserStatus } from '@preload/index';
import { BrowserButton } from '@renderer/shared/browser/button';
import type { BrowserNavigation } from '@renderer/shared/browser/navigation';
import { BrowserReloadIcon } from '@renderer/shared/browser/reload';
import { formatBrowserAddress } from '@renderer/shared/browser/url';
import { useBrowserBounds } from '@renderer/shared/browser/use-bounds';
import { useBrowserInspect } from '@renderer/shared/browser/use-inspect';
import { useBrowserScreenshot } from '@renderer/shared/browser/use-screenshot';
import { usePanelMotion } from '@renderer/shared/panel/context';
import {
  BrowserEmptyIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ScreenshotIcon,
  SquareCursorIcon
} from '@renderer/ui/icons';
import type { JSX } from 'preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

interface BrowserPanelProps {
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
  canGoForward: false
};

export const BrowserPanel = ({ navigation, onUrlOpened, onInspectText }: BrowserPanelProps) => {
  const mountedRef = useRef(true);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const [address, setAddress] = useState('');
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<BrowserStatus>(emptyStatus);
  const [active, setActive] = useState(() => Boolean(navigation.url));
  const { moving: panelMoving } = usePanelMotion();
  const syncBounds = useBrowserBounds({ active, moving: panelMoving, viewportRef });
  const { inspecting, toggle: toggleInspect } = useBrowserInspect({ onText: onInspectText });
  const { copied, capture: captureScreenshot } = useBrowserScreenshot({ onError: setError });

  const applyStatus = useCallback(
    (nextStatus: BrowserStatus) => {
      if (!mountedRef.current) return;
      setStatus(nextStatus);
      setActive(Boolean(nextStatus.url || nextStatus.loading));
      if (!editing) setAddress(formatBrowserAddress(nextStatus.url));
    },
    [editing]
  );

  const openAddress = useCallback(
    async (value: string) => {
      const next = value.trim();
      if (!next) {
        setActive(false);
        setError('');
        setStatus(emptyStatus);
        return;
      }

      setActive(true);
      setError('');
      await syncBounds();
      if (!mountedRef.current) return;

      const result: BrowserActionResult = await window.pi.app.browserOpen(value).catch(() => ({
        ok: false,
        error: 'This site cannot be loaded.'
      }));
      if (!mountedRef.current) return;

      if (!result.ok) {
        setActive(false);
        setStatus(emptyStatus);
        setError(result.error ?? 'This site cannot be loaded.');
        return;
      }

      setError('');
      if (result.status) applyStatus(result.status);
    },
    [applyStatus, syncBounds]
  );

  const submitAddress = useCallback(
    (event: JSX.TargetedSubmitEvent<HTMLFormElement>) => {
      event.preventDefault();
      void openAddress(address);
    },
    [address, openAddress]
  );

  const goBack = useCallback(() => {
    window.pi.app.browserBack().then((result) => result.status && applyStatus(result.status));
  }, [applyStatus]);

  const goForward = useCallback(() => {
    window.pi.app.browserForward().then((result) => result.status && applyStatus(result.status));
  }, [applyStatus]);

  const reloadOrStop = useCallback(() => {
    const action = status.loading ? window.pi.app.browserStop : window.pi.app.browserReload;
    action().then((result) => result.status && applyStatus(result.status));
  }, [applyStatus, status.loading]);

  useEffect(() => window.pi.app.onBrowserStatus(applyStatus), [applyStatus]);

  useEffect(() => {
    const url = navigation.url;
    if (!url) return;
    setAddress(formatBrowserAddress(url));
    void openAddress(url);
    onUrlOpened();
  }, [navigation.id, navigation.url, onUrlOpened, openAddress]);

  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    []
  );

  const refreshLabel = status.loading ? 'Stop loading' : 'Refresh';
  const screenshotLabel = copied ? 'Copied' : 'Screenshot';
  const inspectLabel = inspecting ? 'Stop annotating' : 'Annotate';

  return (
    <div class="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-canvas/95 text-ink backdrop-blur-xl dark:bg-canvas/90">
      <div class="flex h-12 min-w-0 shrink-0 items-center gap-0 border-b border-line px-2">
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
      {error && <div class="shrink-0 border-b border-line px-3 py-2 text-xs leading-5 text-danger">{error}</div>}
      <div ref={viewportRef} class="relative min-h-0 min-w-0 flex-1 overflow-hidden">
        {!active && (
          <div class="absolute inset-0 grid place-items-center px-8 text-center">
            <div class="grid justify-items-center gap-3 text-soft">
              <BrowserEmptyIcon class="size-7" strokeWidth={1.5} />
              <p class="max-w-56 text-sm leading-5">Enter a URL to browse</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
