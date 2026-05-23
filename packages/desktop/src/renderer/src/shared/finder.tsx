import { ComposerAttachedPanel } from '@renderer/shared/composer/panel';
import { tw } from '@renderer/utils/tw';
import { useEffect, useRef } from 'preact/hooks';

export interface FinderItem {
  description?: string;
  name: string;
  path: string;
  type: 'directory' | 'file' | 'skill';
}

interface FinderProps {
  items: FinderItem[];
  visible: boolean;
  activePath: string | undefined;
  ariaLabel: string;
  emptyLabel: string;
  onSelect: (item: FinderItem) => void;
}

export const finderItemId = (path: string) => `finder-${encodeURIComponent(path)}`;

export const Finder = ({ activePath, ariaLabel, emptyLabel, items, onSelect, visible }: FinderProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeOptionId = activePath ? finderItemId(activePath) : '';

  useEffect(() => {
    if (!activePath) return;

    scrollRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [activePath]);

  if (!visible) return null;

  return (
    <ComposerAttachedPanel>
      <div
        {...(activeOptionId ? { 'aria-activedescendant': activeOptionId } : {})}
        ref={scrollRef}
        aria-label={ariaLabel}
        id="composer-finder"
        role="listbox"
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
        class="flex max-h-52 flex-col gap-1 overflow-y-auto pb-2 [&::-webkit-scrollbar]:hidden"
      >
        {items.length > 0 ? (
          items.map((item) => {
            const selected = item.path === activePath;
            const label = item.type === 'directory' ? `${item.name}/` : item.name;

            return (
              <button
                key={item.path}
                id={finderItemId(item.path)}
                role="option"
                tabIndex={-1}
                type="button"
                aria-selected={selected}
                onPointerDown={(event) => {
                  event.preventDefault();
                  onSelect(item);
                }}
                class={tw(
                  'flex w-full min-w-0 items-center gap-3 rounded-xl border-0 px-3 py-2 text-left text-sm leading-5 font-medium text-ink outline-0 transition-colors select-none hover:bg-control focus-visible:bg-control',
                  selected && 'bg-control',
                  !selected && 'bg-transparent'
                )}
              >
                <span class="min-w-0 flex-1 truncate">{label}</span>
                {item.description && (
                  <span class="min-w-0 max-w-[68%] flex-none truncate text-right text-xs leading-5 font-medium text-soft">
                    [{item.description}]
                  </span>
                )}
              </button>
            );
          })
        ) : (
          <div class="px-3 py-5 text-center text-sm text-soft">{emptyLabel}</div>
        )}
      </div>
    </ComposerAttachedPanel>
  );
};
