import type { RootItem } from '@preload/index';
import { cn } from '@renderer/utils/cn';
import { useEffect, useRef, useState } from 'preact/hooks';

type FinderProps = {
  items: RootItem[];
  visible: boolean;
  activePath: string | undefined;
  onPresentChange: (present: boolean) => void;
  onSelect: (item: RootItem) => void;
};

export const finderItemId = (path: string) => `finder-${encodeURIComponent(path)}`;

export const Finder = ({ activePath, items, onPresentChange, onSelect, visible }: FinderProps) => {
  const frameRef = useRef<number | undefined>(undefined);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<number | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [shouldRender, setShouldRender] = useState(visible);
  const activeOptionId = activePath ? finderItemId(activePath) : undefined;

  useEffect(() => {
    if (!activePath) return;

    scrollRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [activePath]);

  useEffect(() => {
    if (frameRef.current !== undefined) window.cancelAnimationFrame(frameRef.current);
    if (timeoutRef.current !== undefined) window.clearTimeout(timeoutRef.current);

    if (visible) {
      setShouldRender(true);
      onPresentChange(true);
      frameRef.current = window.requestAnimationFrame(() => setOpen(true));
      return;
    }

    setOpen(false);
    timeoutRef.current = window.setTimeout(() => {
      setShouldRender(false);
      onPresentChange(false);
    }, 160);

    return () => {
      if (frameRef.current !== undefined) window.cancelAnimationFrame(frameRef.current);
      if (timeoutRef.current !== undefined) window.clearTimeout(timeoutRef.current);
    };
  }, [visible, onPresentChange]);

  if (!shouldRender) return null;

  return (
    <div
      aria-activedescendant={activeOptionId}
      aria-label="Project files"
      id="composer-finder"
      role="listbox"
      tabIndex={-1}
      class={cn(
        'absolute right-24 bottom-[calc(100%-0.125rem)] left-24 z-20 origin-bottom overflow-visible rounded-t-2xl bg-composer p-1 opacity-0 transition-[opacity,transform] duration-150 ease-[linear(0,0.402_7.4%,0.711_15.3%,0.929_23.7%,1.008_28.2%,1.067_33%,1.099_36.9%,1.12_41%,1.13_45.4%,1.13_50.1%,1.111_58.5%,1.019_83.2%,1)] will-change-transform [-webkit-app-region:no-drag]',
        open && 'translate-y-0 scale-y-100 opacity-100',
        !open && 'translate-y-1.5 scale-y-[0.985]'
      )}
    >
      <div class="absolute inset-0 -z-10 rounded-t-2xl bg-composer shadow-shell" />
      <div class="pointer-events-none absolute inset-x-0 -bottom-px h-2 bg-composer" />
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
        class="max-h-52 overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
                  'flex w-full items-center rounded-xl border-0 px-3 py-2 text-left text-sm leading-5 font-medium text-ink outline-0 select-none',
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
