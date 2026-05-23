import type { PatchFile } from '@renderer/shared/workspace/changes/diff/parser';
import type { SplitDiffCell, SplitDiffRow, SplitDiffTone } from '@renderer/shared/workspace/changes/diff/rows';
import { splitDiffRows } from '@renderer/shared/workspace/changes/diff/rows';
import { highlightedDiffLine } from '@renderer/shared/workspace/changes/diff/highlight';
import type { DiffFileStatus } from '@renderer/shared/workspace/changes/diff/types';
import { ChevronDownIcon } from '@renderer/ui/icons';
import { cn } from '@renderer/utils/cn';
import { memo } from 'preact/compat';
import { useMemo, useState } from 'preact/hooks';

const lineNumberText = (lineNumber: number | undefined) => (lineNumber ? lineNumber.toString() : '');
const isChangedTone = (tone: SplitDiffTone) => tone === 'add' || tone === 'remove';

const statusLabel = (status: DiffFileStatus) => {
  switch (status) {
    case 'added':
      return 'added';
    case 'copied':
      return 'copied';
    case 'deleted':
      return 'deleted';
    case 'modified':
      return 'modified';
    case 'renamed':
      return 'renamed';
    case 'untracked':
      return 'untracked';
  }
};

const StatusMark = ({ status }: { status: DiffFileStatus }) => (
  <svg
    role="img"
    fill="none"
    viewBox="0 0 24 24"
    title={statusLabel(status)}
    aria-label={statusLabel(status)}
    class={cn(
      'size-4 flex-none',
      status === 'added' && 'text-success',
      status === 'deleted' && 'text-danger',
      status === 'modified' && 'text-amber-500',
      status === 'untracked' && 'text-orange-500',
      status === 'renamed' && 'text-sky-500',
      status === 'copied' && 'text-violet-500'
    )}
  >
    <path
      d="M17.25 3.75H6.75C5.09315 3.75 3.75 5.09315 3.75 6.75V17.25C3.75 18.9069 5.09315 20.25 6.75 20.25H17.25C18.9069 20.25 20.25 18.9069 20.25 17.25V6.75C20.25 5.09315 18.9069 3.75 17.25 3.75Z"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linejoin="round"
    />
    <circle cx="12" cy="12" r="2" fill="currentColor" />
  </svg>
);

const FileStats = ({ file }: { file: PatchFile }) => {
  if (file.added === 0 && file.removed === 0) return null;

  return (
    <div class="flex flex-none items-center gap-2 text-xs leading-4 font-medium tabular-nums">
      <span class="text-success">+{file.added}</span>
      <span class="text-danger">-{file.removed}</span>
    </div>
  );
};

const DiffPane = ({
  cell,
  highlightRevision,
  language,
  side
}: {
  cell: SplitDiffCell;
  highlightRevision: number;
  language: string;
  side: 'left' | 'right';
}) => {
  const addition = cell.tone === 'add';
  const removal = cell.tone === 'remove';
  const changed = isChangedTone(cell.tone);
  const placeholder = cell.tone === 'empty-add' || cell.tone === 'empty-remove';
  const highlightedHtml = highlightedDiffLine(language, cell.content, highlightRevision);

  return (
    <div
      class={cn(
        'grid min-w-0 grid-cols-[0.25rem_3rem_minmax(0,1fr)]',
        side === 'right' && 'border-l border-line/70',
        addition && 'bg-success/[0.045]',
        removal && 'bg-danger/[0.045]',
        placeholder && 'bg-ink/[0.025] dark:bg-white/[0.035]'
      )}
    >
      <span
        class={cn(
          'my-px',
          changed && '[background:repeating-linear-gradient(-45deg,currentColor_0_1px,transparent_1px_3px)]',
          cell.tone === 'add' && 'text-success',
          cell.tone === 'remove' && 'text-danger',
          !changed && 'bg-transparent'
        )}
      />
      <span
        class={cn(
          'select-none px-2 py-0.5 text-right tabular-nums',
          cell.tone === 'add' && 'text-success',
          cell.tone === 'remove' && 'text-danger',
          !changed && 'text-soft'
        )}
      >
        {lineNumberText(cell.lineNumber)}
      </span>
      <pre
        {...(highlightedHtml ? { dangerouslySetInnerHTML: { __html: highlightedHtml } } : {})}
        class={cn(
          'm-0 min-w-0 whitespace-pre-wrap break-words py-0.5 pr-2',
          highlightedHtml && 'text-ink',
          !highlightedHtml && cell.tone === 'add' && 'text-success',
          !highlightedHtml && cell.tone === 'remove' && 'text-danger',
          !highlightedHtml && !addition && !removal && !placeholder && 'text-ink',
          placeholder &&
            'text-soft/25 [background:repeating-linear-gradient(-45deg,currentColor_0_1px,transparent_1px_6px)]'
        )}
      >
        {highlightedHtml ? null : cell.content || '\u00a0'}
      </pre>
    </div>
  );
};

const SplitLineRow = ({
  highlightRevision,
  language,
  row
}: {
  highlightRevision: number;
  language: string;
  row: Extract<SplitDiffRow, { kind: 'line' }>;
}) => (
  <div class="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] text-sm leading-6">
    <DiffPane cell={row.left} language={language} side="left" highlightRevision={highlightRevision} />
    <DiffPane cell={row.right} language={language} side="right" highlightRevision={highlightRevision} />
  </div>
);

const SplitMetaRow = ({ row }: { row: Extract<SplitDiffRow, { kind: 'meta' }> }) => (
  <div class="px-4 py-1 text-xs leading-5 text-soft">{row.content}</div>
);

const SplitRow = ({
  highlightRevision,
  language,
  row
}: {
  highlightRevision: number;
  language: string;
  row: SplitDiffRow;
}) => {
  if (row.kind === 'meta') return <SplitMetaRow row={row} />;
  return <SplitLineRow row={row} language={language} highlightRevision={highlightRevision} />;
};

const DiffHunk = memo(
  ({
    highlightRevision,
    hunk,
    language
  }: {
    highlightRevision: number;
    hunk: PatchFile['hunks'][number];
    language: string;
  }) => {
    const rows = useMemo(() => splitDiffRows(hunk.lines), [hunk.lines]);

    return (
      <div class="min-w-0 pt-2">
        {rows.map((row, index) => (
          <SplitRow
            key={`${hunk.header}:${index}`}
            row={row}
            language={language}
            highlightRevision={highlightRevision}
          />
        ))}
      </div>
    );
  }
);

const EmptyFileDiff = ({ file }: { file: PatchFile }) => (
  <p class="m-0 px-4 py-2 text-sm leading-6 text-soft">
    {file.isBinary ? 'Binary file changed.' : 'No text diff to show.'}
  </p>
);

export const DiffFile = memo(
  ({
    file,
    highlightRevision,
    language,
    status
  }: {
    file: PatchFile;
    highlightRevision: number;
    language: string;
    status: DiffFileStatus;
  }) => {
    const [open, setOpen] = useState(file.added + file.removed <= 320);
    const hasPathChange = Boolean(file.oldPath && file.newPath && file.oldPath !== file.newPath);

    return (
      <section class="min-w-0 border-t border-line first:border-t-0 [contain-intrinsic-size:180px] [content-visibility:auto]">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          class="group/file flex w-full min-w-0 items-center justify-between gap-3 border-0 bg-transparent px-4 py-2.5 text-left outline-0 transition-colors hover:text-hover focus-visible:text-hover"
        >
          <div class="min-w-0">
            <div class="flex min-w-0 items-center gap-2">
              <StatusMark status={status} />
              <span class="min-w-0 truncate text-sm leading-5 font-medium text-ink">{file.displayPath}</span>
            </div>
            {hasPathChange && <p class="m-0 truncate text-xs leading-4 text-soft">from {file.oldPath}</p>}
          </div>
          <div class="flex flex-none items-center gap-3">
            <FileStats file={file} />
            <ChevronDownIcon
              class={cn(
                'size-3.5 flex-none text-soft transition-transform duration-100 ease-out group-hover/file:text-hover group-focus-visible/file:text-hover',
                !open && '-rotate-90'
              )}
            />
          </div>
        </button>
        {open && file.hunks.length === 0 && <EmptyFileDiff file={file} />}
        {open &&
          file.hunks.map((hunk, index) => (
            <DiffHunk
              key={`${file.displayPath}:${hunk.header}:${index}`}
              hunk={hunk}
              language={language}
              highlightRevision={highlightRevision}
            />
          ))}
      </section>
    );
  }
);
