import { Button } from '@base-ui/react/button';
import { Tabs } from '@base-ui/react/tabs';
import type { BrowserTabStatus } from '@preload/index';
import { openNewTab, panelTabOrder, panelTabs } from '@renderer/shared/browser/state';
import { BrowserEmptyIcon, ChangesIcon, PlusIcon, XIcon } from '@renderer/ui/icons';
import { tw } from '@renderer/utils/tw';

interface BrowserTabsProps {
  activeId: string;
  tabs: BrowserTabStatus[];
  onClose: (id: string) => void;
  onSelect: (id: string) => void;
}

const tabLabel = (tab: BrowserTabStatus) => {
  if (tab.title.trim()) return tab.title.trim();
  if (!tab.url) return 'New tab';

  try {
    return new URL(tab.url).hostname;
  } catch {
    return tab.url;
  }
};

export const BrowserTabs = ({ tabs, activeId, onClose, onSelect }: BrowserTabsProps) => {
  const { review, choosing, selected } = panelTabs.value;
  const order = panelTabOrder.value;
  const visibleTabs = [
    ...tabs,
    ...(review ? [{ id: 'review', url: '', title: 'Review', loading: false }] : []),
    ...(choosing ? [{ id: 'new', url: '', title: 'New tab', loading: false }] : [])
  ].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  if (tabs.length === 0 && selected === 'browser')
    visibleTabs.push({ id: 'empty', url: '', title: '', loading: false });

  const select = (value: unknown) => {
    if (typeof value === 'string' && value !== 'empty') onSelect(value);
  };

  return (
    <Tabs.Root
      onValueChange={select}
      className="min-w-0 flex-1"
      value={selected === 'browser' ? activeId || 'empty' : selected}
    >
      <div class="flex min-w-0 items-center gap-1.5">
        <Tabs.List
          aria-label="Browser and review tabs"
          className="no-scroll-bar flex min-w-0 items-center gap-1.5 overflow-x-auto overflow-y-hidden"
        >
          {visibleTabs.map((tab) => {
            const label = tabLabel(tab);
            const Icon = tab.id === 'review' ? ChangesIcon : BrowserEmptyIcon;

            return (
              <div key={tab.id} class="group relative h-7 min-w-0 max-w-52 flex-none">
                <Tabs.Tab
                  title={label}
                  value={tab.id}
                  className="flex h-7 w-full min-w-0 items-center gap-1.5 rounded-lg border border-line bg-transparent py-0 pr-3 pl-2 text-left text-xs leading-7 font-medium text-soft outline-0 transition-colors hover:text-ink focus-visible:text-ink focus-visible:underline focus-visible:underline-offset-4 data-[active]:bg-control/45 data-[active]:text-ink"
                >
                  <span class="relative grid size-4 flex-none place-items-center">
                    <Icon
                      class={tw(
                        'size-3.5',
                        tab.id !== 'empty' && 'group-hover:opacity-0 group-has-[[data-close]:focus-visible]:opacity-0'
                      )}
                    />
                  </span>
                  <span class="min-w-0 truncate">{label}</span>
                </Tabs.Tab>
                {tab.id !== 'empty' && (
                  <button
                    type="button"
                    aria-label={`Close ${label}`}
                    data-close=""
                    title="Close tab"
                    onClick={() => onClose(tab.id)}
                    class="group/close absolute top-1/2 left-1.5 grid size-5 -translate-y-1/2 place-items-center border-0 bg-transparent p-0 text-soft opacity-0 outline-0 transition-[color,opacity] group-hover:opacity-100 focus-visible:opacity-100 hover:text-ink focus-visible:text-ink"
                  >
                    <span class="grid size-4 place-items-center rounded-full transition-colors group-hover/close:bg-ink/10">
                      <XIcon class="size-3" />
                    </span>
                  </button>
                )}
              </div>
            );
          })}
        </Tabs.List>
        <Button
          aria-label="New tab"
          onClick={openNewTab}
          className="relative grid size-7 flex-none place-items-center rounded-lg border border-line bg-transparent p-0 text-soft outline-0 transition-colors before:absolute before:-inset-1 hover:text-ink focus-visible:text-ink"
        >
          <PlusIcon class="size-4" />
        </Button>
      </div>
    </Tabs.Root>
  );
};
