import { highlightedDiffLine } from '@renderer/shared/workspace/changes/diff/highlight';
import type { PatchFile, PatchLine } from '@renderer/shared/workspace/changes/diff/parser';
import type { SplitDiffCell, SplitDiffRow, SplitDiffTone } from '@renderer/shared/workspace/changes/diff/rows';
import type { DiffViewMode } from '@renderer/shared/workspace/changes/diff/types';
import { splitDiffRows } from '@renderer/shared/workspace/changes/diff/rows';
import { tw } from '@renderer/utils/tw';
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
  viewMode: DiffViewMode;
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
      class={tw(
        'grid min-w-0 grid-cols-[0.25rem_3rem_minmax(0,1fr)]',
        side === 'right' && 'border-l border-line/70',
        addition && 'bg-success/[0.045]',
        removal && 'bg-danger/[0.045]',
        placeholder && 'bg-ink/[0.025] dark:bg-white/[0.035]'
      )}
    >
      <span
        class={tw(
          'my-px',
          changed && '[background:repeating-linear-gradient(-45deg,currentColor_0_1px,transparent_1px_3px)]',
          cell.tone === 'add' && 'text-success',
          cell.tone === 'remove' && 'text-danger',
          !changed && 'bg-transparent'
        )}
      />
      <span
        class={tw(
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
        class={tw(
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

const UnifiedMetaRow = ({ line }: { line: PatchLine }) => (
  <div class="px-4 py-1 text-xs leading-5 text-soft">{line.content}</div>
);

const UnifiedLineRow = ({
  highlightRevision,
  language,
  line
}: {
  highlightRevision: number;
  language: string;
  line: PatchLine;
}) => {
  const addition = line.kind === 'add';
  const removal = line.kind === 'remove';
  const changed = addition || removal;
  const highlightedHtml = highlightedDiffLine(language, line.content, highlightRevision);

  return (
    <div
      class={tw(
        'grid min-w-0 grid-cols-[0.25rem_3rem_3rem_minmax(0,1fr)] text-sm leading-6',
        addition && 'bg-success/[0.045]',
        removal && 'bg-danger/[0.045]'
      )}
    >
      <span
        aria-hidden="true"
        class={tw(
          'my-px',
          changed && '[background:repeating-linear-gradient(-45deg,currentColor_0_1px,transparent_1px_3px)]',
          addition && 'text-success',
          removal && 'text-danger',
          !changed && 'bg-transparent'
        )}
      />
      <span
        title="old line"
        class={tw('select-none px-2 py-0.5 text-right tabular-nums', removal && 'text-danger', !removal && 'text-soft')}
      >
        {lineNumberText(line.oldLine)}
      </span>
      <span
        title="new line"
        class={tw(
          'select-none px-2 py-0.5 text-right tabular-nums',
          addition && 'text-success',
          !addition && 'text-soft'
        )}
      >
        {lineNumberText(line.newLine)}
      </span>
      <pre
        {...(highlightedHtml ? { dangerouslySetInnerHTML: { __html: highlightedHtml } } : {})}
        class={tw(
          'm-0 min-w-0 whitespace-pre-wrap break-words py-0.5 pr-2',
          highlightedHtml && 'text-ink',
          !highlightedHtml && addition && 'text-success',
          !highlightedHtml && removal && 'text-danger',
          !highlightedHtml && !changed && 'text-ink'
        )}
      >
        {highlightedHtml ? null : line.content || '\u00a0'}
      </pre>
    </div>
  );
};

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
    padded,
    viewMode
  }: {
    highlightRevision: number;
    hunk: PatchFile['hunks'][number];
    language: string;
    padded: boolean;
    viewMode: DiffViewMode;
  }) => {
    const splitRows = useMemo(() => (viewMode === 'split' ? splitDiffRows(hunk.lines) : []), [hunk.lines, viewMode]);

    return (
      <div class={tw('min-w-0', padded && 'pt-2')}>
        {viewMode === 'split'
          ? splitRows.map((row, index) => (
              <SplitRow
                key={`${hunk.header}:${index}`}
                row={row}
                language={language}
                highlightRevision={highlightRevision}
              />
            ))
          : hunk.lines.map((line, index) =>
              line.kind === 'meta' ? (
                <UnifiedMetaRow key={`${hunk.header}:${index}`} line={line} />
              ) : (
                <UnifiedLineRow
                  key={`${hunk.header}:${index}`}
                  line={line}
                  language={language}
                  highlightRevision={highlightRevision}
                />
              )
            )}
      </div>
    );
  }
);

export const DiffHunks = memo(({ file, highlightRevision, language, viewMode }: DiffHunksProps) => (
  <>
    {file.hunks.map((hunk, index) => {
      const previousHunk = index > 0 ? file.hunks[index - 1] : undefined;
      const hiddenLines = previousHunk ? hiddenLineCount(previousHunk, hunk) : 0;

      return (
        <div key={`${file.displayPath}:${hunk.header}:${index}`} class="min-w-0">
          {hiddenLines > 0 && <HunkGap hiddenLines={hiddenLines} />}
          <DiffHunk
            hunk={hunk}
            language={language}
            padded={index === 0}
            viewMode={viewMode}
            highlightRevision={highlightRevision}
          />
        </div>
      );
    })}
  </>
));
