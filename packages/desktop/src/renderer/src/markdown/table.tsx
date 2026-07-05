import { CheckIcon, CopyIcon } from '@renderer/ui/icons';
import { tw } from '@renderer/utils/tw';
import type { ComponentChildren, RefObject } from 'preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type { StreamdownProps } from 'streamdown';

interface ScrollEdges {
  left: boolean;
  right: boolean;
}

const useScrollEdges = (ref: RefObject<HTMLElement>): ScrollEdges => {
  const [edges, setEdges] = useState<ScrollEdges>({ left: false, right: false });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const sync = () => {
      const left = element.scrollLeft > 1;
      const right = element.scrollLeft + element.clientWidth < element.scrollWidth - 1;
      setEdges((current) => (current.left === left && current.right === right ? current : { left, right }));
    };

    element.addEventListener('scroll', sync, { passive: true });
    const observer = new ResizeObserver(sync);
    observer.observe(element);
    if (element.firstElementChild) observer.observe(element.firstElementChild);
    sync();
    return () => {
      element.removeEventListener('scroll', sync);
      observer.disconnect();
    };
  }, [ref]);

  return edges;
};

interface MarkdownTableProps {
  className?: string;
  children?: ComponentChildren;
}

interface TableCopyButtonProps {
  tableRef: {
    current: HTMLTableElement | null;
  };
}

const tableText = (table: HTMLTableElement) =>
  Array.from(table.rows)
    .map((row) =>
      Array.from(row.cells)
        .map((cell) => cell.textContent?.trim() ?? '')
        .join('\t')
    )
    .join('\n');

const TableCopyButton = ({ tableRef }: TableCopyButtonProps) => {
  const timeoutRef = useRef(0);
  const [copied, setCopied] = useState(false);
  const Icon = copied ? CheckIcon : CopyIcon;
  const copyTable = useCallback(() => {
    const table = tableRef.current;
    if (!table || !navigator.clipboard) return;

    void navigator.clipboard
      .writeText(tableText(table))
      .then(() => {
        window.clearTimeout(timeoutRef.current);
        setCopied(true);
        timeoutRef.current = window.setTimeout(() => setCopied(false), 1400);
      })
      .catch(() => {});
  }, [tableRef]);

  useEffect(
    () => () => {
      window.clearTimeout(timeoutRef.current);
    },
    []
  );

  return (
    <button
      type="button"
      onClick={copyTable}
      aria-label="Copy table"
      class="absolute top-1.5 right-1.5 grid size-5 place-items-center rounded-md border-0 bg-control p-0 text-soft opacity-0 transition-[color,opacity] ease-in hover:text-hover group-hover/table:opacity-100 focus-visible:opacity-100"
    >
      <Icon class="size-3" />
    </button>
  );
};

const MarkdownTable = ({ className, children }: MarkdownTableProps) => {
  const tableRef = useRef<HTMLTableElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const edges = useScrollEdges(scrollerRef);

  return (
    <div data-streamdown="table-wrapper" class={tw('group/table relative max-w-full', className)}>
      <div ref={scrollerRef} class="max-w-full overflow-x-auto rounded-[inherit] [&::-webkit-scrollbar]:hidden">
        <table ref={tableRef} data-streamdown="table" class="w-max min-w-full border-collapse text-sm">
          {children}
        </table>
      </div>
      {edges.left && (
        <div
          aria-hidden="true"
          class="pointer-events-none absolute inset-y-0 left-0 w-10 rounded-l-[inherit] bg-gradient-to-r from-ink/5 to-transparent"
        />
      )}
      {edges.right && (
        <div
          aria-hidden="true"
          class="pointer-events-none absolute inset-y-0 right-0 w-10 rounded-r-[inherit] bg-gradient-to-l from-ink/5 to-transparent"
        />
      )}
      <TableCopyButton tableRef={tableRef} />
    </div>
  );
};

export const markdownComponents = {
  table: MarkdownTable
} as unknown as NonNullable<StreamdownProps['components']>;
