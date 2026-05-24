import type { GitPatchSection } from '@preload/index';
import { estimatedFileHeight, isOpenByDefault } from '@renderer/shared/workspace/changes/diff/estimate';
import { DiffFile } from '@renderer/shared/workspace/changes/diff/file';
import {
  cacheDiffHighlight,
  collectDiffHighlightItems,
  diffHighlightBatchSize,
  diffHighlightRevisionBatchCount,
  hasDiffHighlight,
  loadCodeHighlighter
} from '@renderer/shared/workspace/changes/diff/highlight';
import { patchFileKind } from '@renderer/shared/workspace/changes/diff/kind';
import { patchFileLanguage } from '@renderer/shared/workspace/changes/diff/language';
import type { PatchFile } from '@renderer/shared/workspace/changes/diff/parser';
import { effectiveOpen, toggleOpen } from '@renderer/shared/workspace/changes/diff/toggle';
import type { DiffEntriesState, DiffEntry, DiffViewMode } from '@renderer/shared/workspace/changes/diff/types';
import { Virtual } from '@renderer/ui/virtual';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

interface ParseResponse {
  jobId: number;
  results: PatchFile[][];
}

const patchFileKey = (file: PatchFile, sectionKind: GitPatchSection['kind'], index: number) =>
  `${sectionKind}:${file.oldPath}:${file.newPath}:${index}`;

const entriesFromResults = (sections: GitPatchSection[], results: PatchFile[][]): DiffEntry[] => {
  const entries: DiffEntry[] = [];
  for (const [sectionIndex, section] of sections.entries()) {
    const files = results[sectionIndex] ?? [];
    for (const [fileIndex, file] of files.entries()) {
      entries.push({
        file,
        key: patchFileKey(file, section.kind, fileIndex),
        language: patchFileLanguage(file),
        status: section.kind === 'untracked' ? 'untracked' : file.status
      });
    }
  }
  return entries;
};

const entryKey = (entry: DiffEntry) => entry.key;
const estimateEntryHeight = (entry: DiffEntry) => estimatedFileHeight(entry.file, patchFileKind(entry.file));

const createParserWorker = () => new Worker(new URL('./parser.worker.ts', import.meta.url), { type: 'module' });

const useDiffEntries = (sections: GitPatchSection[]) => {
  const [entryState, setEntryState] = useState<DiffEntriesState>({ kind: 'parsing' });
  const workerRef = useRef<Worker | null>(null);
  const jobIdRef = useRef(0);

  useEffect(() => {
    if (!workerRef.current) workerRef.current = createParserWorker();
    const worker = workerRef.current;
    jobIdRef.current += 1;
    const jobId = jobIdRef.current;

    setEntryState((current) => (current.kind === 'parsing' ? current : { kind: 'parsing' }));

    const onMessage = (event: MessageEvent<ParseResponse>) => {
      if (event.data.jobId !== jobId) return;
      setEntryState({ entries: entriesFromResults(sections, event.data.results), kind: 'ready' });
    };

    worker.addEventListener('message', onMessage);
    worker.postMessage({ jobId, patches: sections.map((section) => section.patch) });

    return () => {
      worker.removeEventListener('message', onMessage);
    };
  }, [sections]);

  useEffect(
    () => () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    },
    []
  );

  return entryState;
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
  sections,
  viewMode
}: {
  cwd: string;
  viewMode: DiffViewMode;
  sections: GitPatchSection[];
}) => {
  const entryState = useDiffEntries(sections);
  const limited = sections.some((section) => section.limited && !section.patch);
  const entries = entryState.kind === 'ready' ? entryState.entries : [];
  const highlightRevision = useDiffHighlighting(entryState);
  const [toggled, setToggled] = useState<ReadonlyMap<string, boolean>>(() => new Map());

  const onToggle = useCallback((key: string, currentlyOpen: boolean) => {
    setToggled((previous) => toggleOpen(previous, key, currentlyOpen));
  }, []);

  const renderEntry = useCallback(
    (entry: DiffEntry) => {
      const open = effectiveOpen(toggled, entry.key, isOpenByDefault(entry.file, patchFileKind(entry.file)));
      return (
        <DiffFile
          cwd={cwd}
          open={open}
          entryKey={entry.key}
          file={entry.file}
          onToggle={onToggle}
          viewMode={viewMode}
          status={entry.status}
          language={entry.language}
          highlightRevision={highlightRevision}
        />
      );
    },
    [cwd, toggled, onToggle, viewMode, highlightRevision]
  );

  return (
    <div class="flex min-w-0 flex-col font-mono text-sm leading-5 text-ink">
      {entryState.kind === 'parsing' && <p class="m-0 px-4 py-2 text-sm leading-6 text-soft">Preparing diff</p>}
      {entryState.kind === 'ready' && limited && (
        <p class="m-0 px-4 py-2 text-sm leading-6 text-soft">Diff too large to show.</p>
      )}
      {entryState.kind === 'ready' && entries.length === 0 && !limited && (
        <p class="m-0 px-4 py-2 text-sm leading-6 text-soft">No diff to show.</p>
      )}
      {entryState.kind === 'ready' && entries.length > 0 && (
        <Virtual items={entries} getKey={entryKey} renderItem={renderEntry} estimateHeight={estimateEntryHeight} />
      )}
    </div>
  );
};
