import type { GitPatchSection } from '@preload/index';
import { DiffFile } from '@renderer/shared/workspace/changes/diff/file';
import {
  cacheDiffHighlight,
  collectDiffHighlightItems,
  diffHighlightBatchSize,
  diffHighlightRevisionBatchCount,
  hasDiffHighlight,
  loadCodeHighlighter
} from '@renderer/shared/workspace/changes/diff/highlight';
import { patchFileLanguage } from '@renderer/shared/workspace/changes/diff/language';
import type { PatchFile } from '@renderer/shared/workspace/changes/diff/parser';
import { parseGitPatch } from '@renderer/shared/workspace/changes/diff/parser';
import type { DiffEntriesState, DiffEntry, DiffViewMode } from '@renderer/shared/workspace/changes/diff/types';
import { useEffect, useState } from 'preact/hooks';

const initialRenderedEntryCount = 40;
const renderedEntryBatchSize = 40;

const patchFileKey = (file: PatchFile, sectionKind: GitPatchSection['kind'], index: number) =>
  `${sectionKind}:${file.oldPath}:${file.newPath}:${index}`;

const diffEntries = (sections: GitPatchSection[]): DiffEntry[] =>
  sections.flatMap((section) =>
    parseGitPatch(section.patch).map((file, index) => ({
      file,
      key: patchFileKey(file, section.kind, index),
      language: patchFileLanguage(file),
      status: section.kind === 'untracked' ? 'untracked' : file.status
    }))
  );

const useDiffEntries = (sections: GitPatchSection[]) => {
  const [entryState, setEntryState] = useState<DiffEntriesState>({ kind: 'parsing' });

  useEffect(() => {
    let active = true;
    setEntryState((current) => (current.kind === 'parsing' ? current : { kind: 'parsing' }));
    const timer = window.setTimeout(() => {
      const nextEntries = diffEntries(sections);
      if (active) setEntryState({ entries: nextEntries, kind: 'ready' });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [sections]);

  return entryState;
};

const useProgressiveEntries = (entries: DiffEntry[], entryState: DiffEntriesState) => {
  const [renderedEntryCount, setRenderedEntryCount] = useState(initialRenderedEntryCount);

  useEffect(() => {
    if (entryState.kind !== 'ready') return;
    setRenderedEntryCount(Math.min(initialRenderedEntryCount, entryState.entries.length));
  }, [entryState]);

  useEffect(() => {
    if (renderedEntryCount >= entries.length) return;

    const frame = window.requestAnimationFrame(() => {
      setRenderedEntryCount((count) => Math.min(count + renderedEntryBatchSize, entries.length));
    });

    return () => window.cancelAnimationFrame(frame);
  }, [entries.length, renderedEntryCount]);

  return entries.length > renderedEntryCount ? entries.slice(0, renderedEntryCount) : entries;
};

const useDiffHighlighting = (entryState: DiffEntriesState) => {
  const [highlightRevision, setHighlightRevision] = useState(0);

  useEffect(() => {
    if (entryState.kind !== 'ready' || entryState.entries.length === 0) return;

    let active = true;
    let frame = 0;
    let batchesSinceUpdate = 0;

    void loadCodeHighlighter()
      .then(({ highlightCode }) => {
        if (!active) return;

        const items = collectDiffHighlightItems(entryState.entries);
        let index = 0;

        const processBatch = () => {
          const end = Math.min(index + diffHighlightBatchSize, items.length);
          const pendingHighlights: Promise<void>[] = [];

          for (let itemIndex = index; itemIndex < end; itemIndex += 1) {
            const item = items[itemIndex];
            if (item && !hasDiffHighlight(item.key)) {
              pendingHighlights.push(
                highlightCode(item.content, item.language).then((html) => {
                  cacheDiffHighlight(item.key, html);
                })
              );
            }
          }

          void Promise.all(pendingHighlights).then(() => {
            index = end;
            batchesSinceUpdate += 1;

            if (!active) return;

            if (batchesSinceUpdate >= diffHighlightRevisionBatchCount || index >= items.length) {
              batchesSinceUpdate = 0;
              setHighlightRevision((value) => value + 1);
            }

            if (index < items.length) frame = window.requestAnimationFrame(processBatch);
          });
        };

        frame = window.requestAnimationFrame(processBatch);
      })
      .catch(() => {});

    return () => {
      active = false;
      window.cancelAnimationFrame(frame);
    };
  }, [entryState]);

  return highlightRevision;
};

export const GitDiffViewer = ({
  cwd,
  viewMode,
  sections
}: {
  cwd: string;
  viewMode: DiffViewMode;
  sections: GitPatchSection[];
}) => {
  const entryState = useDiffEntries(sections);
  const limited = sections.some((section) => section.limited && !section.patch);
  const entries = entryState.kind === 'ready' ? entryState.entries : [];
  const highlightRevision = useDiffHighlighting(entryState);
  const visibleEntries = useProgressiveEntries(entries, entryState);

  return (
    <div class="flex min-w-0 flex-col font-mono text-sm leading-5 text-ink">
      {entryState.kind === 'parsing' && <p class="m-0 px-4 py-2 text-sm leading-6 text-soft">Preparing diff</p>}
      {entryState.kind === 'ready' && limited && (
        <p class="m-0 px-4 py-2 text-sm leading-6 text-soft">Diff too large to show.</p>
      )}
      {entryState.kind === 'ready' && entries.length === 0 && !limited && (
        <p class="m-0 px-4 py-2 text-sm leading-6 text-soft">No diff to show.</p>
      )}
      {visibleEntries.map((entry) => (
        <DiffFile
          key={entry.key}
          cwd={cwd}
          file={entry.file}
          viewMode={viewMode}
          status={entry.status}
          language={entry.language}
          highlightRevision={highlightRevision}
        />
      ))}
    </div>
  );
};
