import { CheckIcon, CopyIcon } from '@renderer/ui/icons';
import { tw } from '@renderer/utils/tw';
import type { ComponentChildren } from 'preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type { StreamdownProps } from 'streamdown';

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
      class="absolute top-1.5 right-1.5 grid size-5 place-items-center rounded-md border-0 bg-transparent p-0 text-soft opacity-0 transition-[background-color,color,opacity] ease-in hover:bg-line hover:text-hover group-hover/table:opacity-100 focus-visible:opacity-100"
    >
      <Icon class="size-3" />
    </button>
  );
};

const MarkdownTable = ({ className, children }: MarkdownTableProps) => {
  const tableRef = useRef<HTMLTableElement>(null);

  return (
    <div
      data-streamdown="table-wrapper"
      class={tw(
        'group/table relative my-2 max-w-full overflow-x-auto rounded-lg border border-line bg-transparent [&::-webkit-scrollbar]:hidden',
        className
      )}
    >
      <table ref={tableRef} data-streamdown="table" class="w-max min-w-full border-collapse text-sm">
        {children}
      </table>
      <TableCopyButton tableRef={tableRef} />
    </div>
  );
};

export const markdownComponents = {
  table: MarkdownTable
} as unknown as NonNullable<StreamdownProps['components']>;
