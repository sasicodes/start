import { CheckIcon, CopyIcon } from '@renderer/ui/icons';
import { cn } from '@renderer/utils/cn';
import type { ComponentChildren } from 'preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type { StreamdownProps } from 'streamdown';

interface MarkdownTableProps {
  children?: ComponentChildren;
  className?: string;
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
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef(0);
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
      aria-label="Copy table"
      class="absolute top-1.5 right-1.5 grid size-5 place-items-center rounded-md border-0 bg-transparent p-0 text-soft opacity-0 transition-[background-color,color,opacity] ease-in hover:bg-line hover:text-hover group-hover/table:opacity-100 focus-visible:opacity-100"
      onClick={copyTable}
    >
      <Icon class="size-3" />
    </button>
  );
};

const MarkdownTable = ({ children, className }: MarkdownTableProps) => {
  const tableRef = useRef<HTMLTableElement>(null);

  return (
    <div
      class={cn(
        'group/table relative my-2 max-w-full overflow-x-auto rounded-lg border border-line bg-transparent [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className
      )}
      data-streamdown="table-wrapper"
    >
      <table ref={tableRef} class="w-max min-w-full border-collapse text-sm" data-streamdown="table">
        {children}
      </table>
      <TableCopyButton tableRef={tableRef} />
    </div>
  );
};

export const markdownComponents = {
  table: MarkdownTable
} as unknown as NonNullable<StreamdownProps['components']>;
