import type { RootItem } from '@preload/index';
import { ComposerAttachedPanel } from '@renderer/shared/composer/attached-panel';
import { cn } from '@renderer/utils/cn';
import { useEffect, useRef } from 'preact/hooks';

interface FinderProps {
  items: RootItem[];
  visible: boolean;
  activePath: string | undefined;
  onSelect: (item: RootItem) => void;
}

export const finderItemId = (path: string) => `finder-${encodeURIComponent(path)}`;

export const Finder = ({ activePath, items, onSelect, visible }: FinderProps) => {
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
        aria-label="Project files"
        id="composer-finder"
        role="listbox"
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
        class="flex max-h-52 flex-col gap-1 overflow-y-auto pb-2 [&::-webkit-scrollbar]:hidden"
      >
        {items.length > 0 ? (
          items.map((item) => {
            const selected = item.path === activePath;

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
                class={cn(
                  'flex w-full items-center rounded-xl border-0 px-3 py-2 text-left text-sm leading-5 font-medium text-ink outline-0 transition-colors select-none hover:bg-control focus-visible:bg-control',
                  selected && 'bg-control',
                  !selected && 'bg-transparent'
                )}
              >
                <span class="truncate">
                  {item.name}
                  {item.type === 'directory' ? '/' : ''}
                </span>
              </button>
            );
          })
        ) : (
          <div class="px-3 py-5 text-center text-sm text-soft">No matching items</div>
        )}
      </div>
    </ComposerAttachedPanel>
  );
};
