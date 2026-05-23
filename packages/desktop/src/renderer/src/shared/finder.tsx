import type { RootItem } from '@preload/index';
import { cn } from '@renderer/utils/cn';
import { useEffect, useRef } from 'preact/hooks';

type FinderProps = {
  items: RootItem[];
  visible: boolean;
  activePath: string | undefined;
  onPresentChange: (present: boolean) => void;
  onSelect: (item: RootItem) => void;
};

export const finderItemId = (path: string) => `finder-${encodeURIComponent(path)}`;

export const Finder = ({ activePath, items, onPresentChange, onSelect, visible }: FinderProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeOptionId = activePath ? finderItemId(activePath) : undefined;

  useEffect(() => {
    if (!activePath) return;

    scrollRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [activePath]);

  useEffect(() => {
    onPresentChange(visible);
  }, [visible, onPresentChange]);

  if (!visible) return null;

  return (
    <div
      aria-activedescendant={activeOptionId}
      aria-label="Project files"
      id="composer-finder"
      role="listbox"
      tabIndex={-1}
      onMouseDown={(event) => event.stopPropagation()}
      class="absolute right-24 bottom-[calc(100%-0.125rem)] left-24 z-20 origin-bottom overflow-visible rounded-t-2xl bg-composer p-1 opacity-100 transition-[opacity,transform] duration-150 ease-out will-change-transform [-webkit-app-region:no-drag]"
    >
      <div class="absolute inset-0 -z-10 rounded-t-2xl bg-composer shadow-shell" />
      <svg
        aria-hidden="true"
        class="absolute -bottom-px -left-10 size-10 -scale-x-100 text-composer"
        viewBox="0 0 40 40"
      >
        <path d="M0 0V40H40C8 40 0 32 0 0Z" fill="currentColor" />
      </svg>
      <svg aria-hidden="true" class="absolute -right-10 -bottom-px size-10 text-composer" viewBox="0 0 40 40">
        <path d="M0 0V40H40C8 40 0 32 0 0Z" fill="currentColor" />
      </svg>
      <div
        ref={scrollRef}
        class="flex max-h-52 flex-col gap-1 overflow-y-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
    </div>
  );
};
