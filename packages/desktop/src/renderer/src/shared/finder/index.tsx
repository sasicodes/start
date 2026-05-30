import { Attached } from '@renderer/shared/composer/attached';
import type { BrowserFinderItem } from '@renderer/shared/finder/browser';
import { BrowserIcon, FolderIcon } from '@renderer/ui/icons';
import { tw } from '@renderer/utils/tw';
import { useEffect, useRef } from 'preact/hooks';

interface CommandFinderItem {
  key: string;
  name: string;
  type: 'command';
  description?: string;
}

interface FileFinderItem {
  name: string;
  path: string;
  description?: string;
  type: 'directory' | 'file';
}

export type FinderItem = FileFinderItem | CommandFinderItem | BrowserFinderItem;

interface FinderProps {
  visible: boolean;
  ariaLabel: string;
  emptyLabel: string;
  items: FinderItem[];
  activeItemKey?: string;
  onSelect: (item: FinderItem) => void;
}

interface FinderRowProps {
  item: FinderItem;
  activeItemKey?: string;
  onSelect: (item: FinderItem) => void;
}

export const finderItemKey = (item: FinderItem) => {
  if (item.type === 'browser') return item.key;
  if (item.type === 'command') return item.key;
  return item.path;
};

export const finderItemId = (key: string) => `finder-${encodeURIComponent(key)}`;

const FinderRowIcon = ({ type }: { type: FinderItem['type'] }) => {
  if (type === 'browser') return <BrowserIcon class="size-4 shrink-0 text-soft" />;
  if (type === 'directory') return <FolderIcon class="size-4 shrink-0 text-soft" />;
  return null;
};

const FinderRow = ({ item, onSelect, activeItemKey }: FinderRowProps) => {
  const itemKey = finderItemKey(item);
  const isBrowser = item.type === 'browser';
  const isCommand = item.type === 'command';
  const selected = itemKey === activeItemKey;
  const isDirectory = item.type === 'directory';
  const label = isDirectory ? `${item.name}/` : item.name;
  const description = item.description ? (isBrowser || isCommand ? item.description : `[${item.description}]`) : '';

  return (
    <button
      role="option"
      tabIndex={-1}
      type="button"
      id={finderItemId(itemKey)}
      aria-selected={selected}
      onPointerDown={(event) => {
        event.preventDefault();
        onSelect(item);
      }}
      class={tw(
        'flex w-full min-w-0 rounded-xl border-0 px-3 py-2 text-left text-sm leading-5 font-medium text-ink outline-0 transition-colors select-none hover:bg-control focus-visible:bg-control',
        isCommand ? 'flex-col items-start gap-0.5' : 'items-center gap-2',
        selected ? 'bg-control' : 'bg-transparent'
      )}
    >
      <FinderRowIcon type={item.type} />
      <span class="min-w-0 flex-1 truncate">{label}</span>
      {description && (
        <span
          class={tw(
            'min-w-0 truncate text-xs leading-5 font-medium text-soft',
            isCommand ? 'max-w-full' : 'max-w-[68%] flex-none text-right'
          )}
        >
          {description}
        </span>
      )}
    </button>
  );
};

export const Finder = ({ items, visible, onSelect, ariaLabel, emptyLabel, activeItemKey }: FinderProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeOptionId = activeItemKey ? finderItemId(activeItemKey) : '';

  useEffect(() => {
    if (!activeItemKey) return;

    scrollRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [activeItemKey]);

  if (!visible) return null;

  return (
    <Attached>
      <div
        tabIndex={-1}
        role="listbox"
        ref={scrollRef}
        id="composer-finder"
        aria-label={ariaLabel}
        onMouseDown={(event) => event.stopPropagation()}
        {...(activeOptionId ? { 'aria-activedescendant': activeOptionId } : {})}
        class="flex max-h-52 flex-col gap-1 overflow-y-auto pb-2 [&::-webkit-scrollbar]:hidden"
      >
        {items.length > 0 ? (
          items.map((item) => (
            <FinderRow
              key={finderItemKey(item)}
              item={item}
              onSelect={onSelect}
              {...(activeItemKey ? { activeItemKey } : {})}
            />
          ))
        ) : (
          <div class="px-3 py-5 text-center text-sm text-soft">{emptyLabel}</div>
        )}
      </div>
    </Attached>
  );
};
