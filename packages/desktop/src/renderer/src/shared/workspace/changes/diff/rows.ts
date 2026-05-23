import type { PatchLine } from '@renderer/shared/workspace/changes/diff/parser';

export type SplitDiffTone = 'add' | 'context' | 'empty-add' | 'empty-remove' | 'remove';

export interface SplitDiffCell {
  content: string;
  tone: SplitDiffTone;
  lineNumber?: number;
}

export type SplitDiffRow =
  | {
      kind: 'line';
      left: SplitDiffCell;
      right: SplitDiffCell;
    }
  | {
      content: string;
      kind: 'meta';
    };

interface CollectedLines {
  end: number;
  items: PatchLine[];
}

const emptyCell = (tone: Extract<SplitDiffTone, 'empty-add' | 'empty-remove'>): SplitDiffCell => ({
  content: '',
  tone
});

const cellFromLine = (line: PatchLine, side: 'left' | 'right', tone: SplitDiffTone): SplitDiffCell => {
  const lineNumber = side === 'left' ? line.oldLine : line.newLine;

  return {
    content: line.content,
    tone,
    ...(lineNumber ? { lineNumber } : {})
  };
};

const collectLines = (lines: PatchLine[], start: number, kind: PatchLine['kind']): CollectedLines => {
  const items: PatchLine[] = [];
  let end = start;

  while (lines[end]?.kind === kind) {
    const line = lines[end];
    if (!line) break;
    items.push(line);
    end += 1;
  }

  return { end, items };
};

const appendChangedRows = (rows: SplitDiffRow[], removals: PatchLine[], additions: PatchLine[]) => {
  const count = Math.max(removals.length, additions.length);

  for (let index = 0; index < count; index += 1) {
    const addition = additions[index];
    const removal = removals[index];

    rows.push({
      kind: 'line',
      left: removal ? cellFromLine(removal, 'left', 'remove') : emptyCell('empty-add'),
      right: addition ? cellFromLine(addition, 'right', 'add') : emptyCell('empty-remove')
    });
  }
};

export const splitDiffRows = (lines: PatchLine[]): SplitDiffRow[] => {
  const rows: SplitDiffRow[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line) break;

    if (line.kind === 'context') {
      rows.push({
        kind: 'line',
        left: cellFromLine(line, 'left', 'context'),
        right: cellFromLine(line, 'right', 'context')
      });
      index += 1;
      continue;
    }

    if (line.kind === 'meta') {
      rows.push({ content: line.content, kind: 'meta' });
      index += 1;
      continue;
    }

    if (line.kind === 'remove') {
      const removals = collectLines(lines, index, 'remove');
      const additions = collectLines(lines, removals.end, 'add');
      appendChangedRows(rows, removals.items, additions.items);
      index = additions.end;
      continue;
    }

    const additions = collectLines(lines, index, 'add');
    appendChangedRows(rows, [], additions.items);
    index = additions.end;
  }

  return rows;
};
