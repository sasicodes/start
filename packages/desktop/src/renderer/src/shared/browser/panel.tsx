import { Button } from '@base-ui/react/button';
import { BrowserButton } from '@renderer/shared/browser/button';
import type { BrowserNavigation } from '@renderer/shared/browser/navigation';
import { BrowserReloadIcon } from '@renderer/shared/browser/reload';
import { completeNewTab } from '@renderer/shared/browser/state';
import { BrowserTabs } from '@renderer/shared/browser/tabs';
import { useBrowser } from '@renderer/shared/browser/use-browser';
import { PanelCloseButton } from '@renderer/shared/panel/close';
import { GitChangesPanel } from '@renderer/shared/workspace/changes';
import {
  BrowserEmptyIcon,
  ChangesIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ScreenshotIcon,
  SquareCursorIcon
} from '@renderer/ui/icons';
import { tw } from '@renderer/utils/tw';
import type { ComponentChildren } from 'preact';

interface BrowserPanelProps {
  path: string;
  onClose: () => void;
  onUrlOpened: () => void;
  navigation: BrowserNavigation;
  onInspectText: (text: string) => void;
}

interface TabChoiceProps {
  label: string;
  onClick: () => void;
  children: ComponentChildren;
}

const TabChoice = ({ label, onClick, children }: TabChoiceProps) => (
  <Button
    onClick={onClick}
    className="flex w-24 shrink-0 flex-col items-center gap-3 border-0 bg-transparent p-4 text-sm text-soft outline-0 hover:text-ink focus-visible:text-ink"
  >
    {children}
    {label}
  </Button>
);

export const BrowserPanel = ({ path, ...options }: BrowserPanelProps) => {
  const { onClose } = options;
  const {
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
  } = useBrowser(options);

  const inspectLabel = inspecting ? 'Stop annotating' : 'Annotate';
  const emptyMessage = error || 'Enter a URL to browse';
  const refreshLabel = status.loading ? 'Stop loading' : 'Refresh';
  const screenshotLabel = copied ? 'Copied' : 'Screenshot';

  return (
    <div class="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-canvas/95 text-ink backdrop-blur-xl dark:bg-canvas/90">
      <div class="flex h-10 min-w-0 shrink-0 items-center gap-0 border-b border-line px-2">
        <BrowserTabs tabs={status.tabs} activeId={status.activeTabId} onClose={closeTab} onSelect={selectTab} />
        <PanelCloseButton onClick={onClose} variant="toolbar" />
      </div>
      {selected === 'new' && (
        <fieldset
          aria-label="Choose tab type"
          class="m-0 flex min-h-0 flex-1 items-center justify-center gap-8 border-0 p-0"
        >
          <TabChoice label="Browser" onClick={createBrowserTab}>
            <BrowserEmptyIcon class="size-8" strokeWidth={1.125} />
          </TabChoice>
          <div aria-hidden="true" class="h-24 w-px shrink-0 bg-line" />
          <TabChoice label="Review" onClick={() => completeNewTab('review')}>
            <ChangesIcon class="size-8" strokeWidth={1.125} />
          </TabChoice>
        </fieldset>
      )}
      {selected === 'review' && (
        <div class="min-h-0 flex-1 overflow-hidden">
          <GitChangesPanel path={path} />
        </div>
      )}
      {selected === 'browser' && (
        <>
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
              tooltipSide="left"
              active={inspecting}
              label={inspectLabel}
              disabled={!status.url}
              onClick={toggleInspect}
              tooltipLabel={inspectLabel}
            >
              <SquareCursorIcon class="size-4" strokeWidth={inspecting ? 2 : 1.5} />
            </BrowserButton>
            <BrowserButton
              tooltipSide="left"
              disabled={!status.url}
              label={screenshotLabel}
              onClick={captureScreenshot}
              tooltipLabel={screenshotLabel}
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
        </>
      )}
    </div>
  );
};
