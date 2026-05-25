import type { BrowserActionResult, BrowserStatus } from '@preload/index';
import { BrowserButton } from '@renderer/shared/browser/button';
import type { BrowserNavigation } from '@renderer/shared/browser/navigation';
import { BrowserReloadIcon } from '@renderer/shared/browser/reload';
import { formatBrowserAddress } from '@renderer/shared/browser/url';
import { useBrowserBounds } from '@renderer/shared/browser/use-bounds';
import { usePanelMotion } from '@renderer/shared/panel/context';
import { CheckIcon, BrowserEmptyIcon, ScreenshotIcon, ChevronLeftIcon, ChevronRightIcon } from '@renderer/ui/icons';
import type { JSX } from 'preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

interface BrowserPanelProps {
  navigation: BrowserNavigation;
  onUrlOpened: () => void;
}

const emptyStatus: BrowserStatus = {
  url: '',
  open: false,
  title: '',
  loading: false,
  canGoBack: false,
  canGoForward: false
};

export const BrowserPanel = ({ navigation, onUrlOpened }: BrowserPanelProps) => {
  const mountedRef = useRef(true);
  const copyTimerRef = useRef<number>(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [active, setActive] = useState(() => Boolean(navigation.url));
  const [status, setStatus] = useState<BrowserStatus>(emptyStatus);
  const { moving: panelMoving } = usePanelMotion();
  const syncBounds = useBrowserBounds({ active, moving: panelMoving, viewportRef });

  const applyStatus = useCallback(
    (nextStatus: BrowserStatus) => {
      if (!mountedRef.current) return;

      setStatus(nextStatus);
      setActive(Boolean(nextStatus.url || nextStatus.loading));
      if (!nextStatus.url && !nextStatus.loading) setError('');
      if (!editing) setAddress(formatBrowserAddress(nextStatus.url));
    },
    [editing]
  );

  const openAddress = useCallback(
    async (value: string) => {
      const nextAddress = value.trim();
      if (!nextAddress) {
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
    void window.pi.app.browserBack().then((result) => result.status && applyStatus(result.status));
  }, [applyStatus]);

  const goForward = useCallback(() => {
    void window.pi.app.browserForward().then((result) => result.status && applyStatus(result.status));
  }, [applyStatus]);

  const reloadOrStop = useCallback(() => {
    const action = status.loading ? window.pi.app.browserStop : window.pi.app.browserReload;
    void action().then((result) => result.status && applyStatus(result.status));
  }, [applyStatus, status.loading]);

  const refreshLabel = status.loading ? 'Stop loading' : 'Refresh';
  const screenshotLabel = copied ? 'Copied' : 'Screenshot';
  const viewportMessage = error || 'Enter a URL to browse';

  const applyScreenshotStatus = useCallback((result: BrowserActionResult) => {
    if (!mountedRef.current) return;

    if (!result.ok) {
      setError(result.error ?? 'Could not capture the page.');
      return;
    }

    setError('');
    setCopied(true);
    copyTimerRef.current = window.setTimeout(() => setCopied(false), 1400);
  }, []);

  const captureScreenshot = useCallback(() => {
    window.clearTimeout(copyTimerRef.current);
    void window.pi.app
      .browserScreenshot()
      .then(applyScreenshotStatus)
      .catch(() => applyScreenshotStatus({ ok: false, error: 'Could not capture the page.' }));
  }, [applyScreenshotStatus]);

  useEffect(() => {
    return window.pi.app.onBrowserStatus(applyStatus);
  }, [applyStatus]);

  useEffect(() => {
    const url = navigation.url;
    if (!url) return;

    setAddress(formatBrowserAddress(url));
    void openAddress(url);
    onUrlOpened();
  }, [navigation.id, navigation.url, onUrlOpened, openAddress]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      window.clearTimeout(copyTimerRef.current);
    };
  }, []);

  return (
    <div class="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-canvas/95 text-ink backdrop-blur-xl dark:bg-canvas/90">
      <div class="flex h-12 min-w-0 shrink-0 items-center gap-2 border-b border-line px-4">
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
          label={screenshotLabel}
          disabled={!status.url}
          onClick={captureScreenshot}
          tooltipLabel={screenshotLabel}
          tooltipSide="left"
        >
          {copied ? <CheckIcon class="size-4" /> : <ScreenshotIcon class="size-4" strokeWidth={1.5} />}
        </BrowserButton>
      </div>
      {error && active && (
        <div class="shrink-0 border-b border-line px-3 py-2 text-xs leading-5 text-danger">{error}</div>
      )}
      <div ref={viewportRef} class="relative min-h-0 min-w-0 flex-1 overflow-hidden">
        {!active && (
          <div class="absolute inset-0 grid place-items-center px-8 text-center">
            <div class="grid justify-items-center gap-3 text-soft">
              <BrowserEmptyIcon class="size-9" strokeWidth={1.5} />
              <p class="max-w-56 text-sm leading-5">{viewportMessage}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
