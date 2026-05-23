import { highlightedDiffLine } from '@renderer/shared/workspace/changes/diff/highlight';
import type { PatchFile } from '@renderer/shared/workspace/changes/diff/parser';
import type { SplitDiffCell, SplitDiffRow, SplitDiffTone } from '@renderer/shared/workspace/changes/diff/rows';
import { splitDiffRows } from '@renderer/shared/workspace/changes/diff/rows';
import { cn } from '@renderer/utils/cn';
import { memo } from 'preact/compat';
import { useMemo } from 'preact/hooks';

interface HunkLineRange {
  first: number;
  last: number;
}

interface DiffHunksProps {
  file: PatchFile;
  highlightRevision: number;
  language: string;
}

const lineNumberText = (lineNumber: number | undefined) => (lineNumber ? lineNumber.toString() : '');
const isChangedTone = (tone: SplitDiffTone) => tone === 'add' || tone === 'remove';

const hunkLineRange = (hunk: PatchFile['hunks'][number], side: 'newLine' | 'oldLine'): HunkLineRange | undefined => {
  let first = 0;
  let last = 0;

  for (const line of hunk.lines) {
    const lineNumber = line[side];
    if (!lineNumber) continue;
    if (!first) first = lineNumber;
    last = lineNumber;
  }

  if (!first || !last) return;
  return { first, last };
};

const hiddenLineCount = (previous: PatchFile['hunks'][number], next: PatchFile['hunks'][number]) => {
  const previousNew = hunkLineRange(previous, 'newLine');
  const previousOld = hunkLineRange(previous, 'oldLine');
  const nextNew = hunkLineRange(next, 'newLine');
  const nextOld = hunkLineRange(next, 'oldLine');
  const newGap = previousNew && nextNew ? nextNew.first - previousNew.last - 1 : 0;
  const oldGap = previousOld && nextOld ? nextOld.first - previousOld.last - 1 : 0;

  return Math.max(0, newGap, oldGap);
};

const hiddenLineLabel = (count: number) => `${count} unchanged ${count === 1 ? 'line' : 'lines'}`;

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

const HunkGap = ({ hiddenLines }: { hiddenLines: number }) => (
  <div class="flex items-center gap-3 px-4 py-2.5 text-xs leading-4 text-soft">
    <span class="h-px min-w-6 flex-1 bg-line" />
    <span class="select-none rounded-full border border-line px-2.5 py-1 font-sans tabular-nums">
      {hiddenLineLabel(hiddenLines)}
    </span>
    <span class="h-px min-w-6 flex-1 bg-line" />
  </div>
);

const DiffHunk = memo(
  ({
    highlightRevision,
    hunk,
    language,
    padded
  }: {
    highlightRevision: number;
    hunk: PatchFile['hunks'][number];
    language: string;
    padded: boolean;
  }) => {
    const rows = useMemo(() => splitDiffRows(hunk.lines), [hunk.lines]);

    return (
      <div class={cn('min-w-0', padded && 'pt-2')}>
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

export const DiffHunks = memo(({ file, highlightRevision, language }: DiffHunksProps) => (
  <>
    {file.hunks.map((hunk, index) => {
      const previousHunk = index > 0 ? file.hunks[index - 1] : undefined;
      const hiddenLines = previousHunk ? hiddenLineCount(previousHunk, hunk) : 0;

      return (
        <div key={`${file.displayPath}:${hunk.header}:${index}`} class="min-w-0">
          {hiddenLines > 0 && <HunkGap hiddenLines={hiddenLines} />}
          <DiffHunk hunk={hunk} language={language} padded={index === 0} highlightRevision={highlightRevision} />
        </div>
      );
    })}
  </>
));
