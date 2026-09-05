import type { BrowserTabStatus } from '@preload/index';
import { BrowserEmptyIcon, PlusIcon, XIcon } from '@renderer/ui/icons';
import { tw } from '@renderer/utils/tw';

interface BrowserTabsProps {
  activeId: string;
  tabs: BrowserTabStatus[];
  onNew: () => void;
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

export const BrowserTabs = ({ tabs, activeId, onNew, onClose, onSelect }: BrowserTabsProps) => {
  const visibleTabs = tabs.length > 0 ? tabs : [{ id: 'empty', url: '', title: '', loading: false }];

  return (
    <div
      role="tablist"
      aria-label="Browser tabs"
      class="no-scroll-bar flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto overflow-y-hidden"
    >
      {visibleTabs.map((tab) => {
        const selected = tab.id === activeId || !activeId;
        const label = tabLabel(tab);

        return (
          <div key={tab.id} class="group relative h-7 min-w-0 max-w-52 flex-none">
            <button
              type="button"
              role="tab"
              aria-selected={selected}
              title={label}
              onClick={() => {
                if (tab.id !== 'empty') onSelect(tab.id);
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
                  onClose(tab.id);
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
        onClick={onNew}
        class="relative grid size-7 flex-none place-items-center rounded-md border-0 bg-transparent p-0 text-soft outline-0 transition-colors before:absolute before:-inset-1 before:content-[''] hover:text-ink focus-visible:text-ink [&_svg]:size-4"
      >
        <PlusIcon strokeWidth={1.5} />
      </button>
    </div>
  );
};
