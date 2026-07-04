import type { GitPatchSection } from '@preload/index';
import { entriesFromResults } from '@renderer/shared/workspace/changes/diff/entries';
import { estimatedFileHeight, isOpenByDefault } from '@renderer/shared/workspace/changes/diff/estimate';
import { DiffFile } from '@renderer/shared/workspace/changes/diff/file';
import { type DiffFold, diffFold, foldOpenDefault } from '@renderer/shared/workspace/changes/diff/fold';
import { patchFileKind } from '@renderer/shared/workspace/changes/diff/kind';
import type { PatchFile } from '@renderer/shared/workspace/changes/diff/parser';
import { effectiveOpen, toggleOpen } from '@renderer/shared/workspace/changes/diff/toggle';
import type { DiffEntriesState, DiffEntry, DiffViewMode } from '@renderer/shared/workspace/changes/diff/types';
import { Virtual } from '@renderer/ui/virtual';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

interface ParseResponse {
  jobId: number;
  results: PatchFile[][];
}

interface LoadedDiffEntriesState {
  sections: GitPatchSection[];
  state: DiffEntriesState;
}

interface FoldToggles {
  fold: DiffFold | null;
  map: ReadonlyMap<string, boolean>;
}

const emptyToggles: ReadonlyMap<string, boolean> = new Map();

const entryKey = (entry: DiffEntry) => entry.key;
const estimateEntryHeight = (entry: DiffEntry) => estimatedFileHeight(entry.file, patchFileKind(entry.file));

const Message = ({ text }: { text: string }) => <p class="m-0 px-4 py-2 text-sm leading-6 text-soft">{text}</p>;

const createParserWorker = () => new Worker(new URL('./parser.worker.ts', import.meta.url), { type: 'module' });

const postParseJob = (
  worker: Worker,
  jobId: number,
  sections: GitPatchSection[],
  onReady: (entries: DiffEntry[]) => void
) => {
  const onMessage = (event: MessageEvent<ParseResponse>) => {
    if (event.data.jobId !== jobId) return;
    onReady(entriesFromResults(sections, event.data.results));
  };
  worker.addEventListener('message', onMessage);
  worker.postMessage({ jobId, patches: sections.map((section) => section.patch) });
  return () => worker.removeEventListener('message', onMessage);
};

const useDiffEntries = (sections: GitPatchSection[]): DiffEntriesState => {
  const [entryState, setEntryState] = useState<LoadedDiffEntriesState>({ sections, state: { kind: 'parsing' } });
  const workerRef = useRef<Worker | null>(null);
  const jobIdRef = useRef(0);

  useEffect(() => {
    if (!workerRef.current) workerRef.current = createParserWorker();
    jobIdRef.current += 1;

    return postParseJob(workerRef.current, jobIdRef.current, sections, (entries) =>
      setEntryState({ sections, state: { entries, kind: 'ready' } })
    );
  }, [sections]);

  useEffect(
    () => () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    },
    []
  );

  return entryState.sections === sections ? entryState.state : { kind: 'parsing' };
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
  const ready = entryState.kind === 'ready';
  const entries = ready ? entryState.entries : [];
  const limited = sections.some((section) => section.limited && !section.patch);
  const [highlightRevision, setHighlightRevision] = useState(0);
  const [toggled, setToggled] = useState<FoldToggles>(() => ({ fold: diffFold.value, map: new Map() }));

  const fold = diffFold.value;
  const overrides = toggled.fold === fold ? toggled.map : emptyToggles;

  const onHighlight = useCallback(() => {
    setHighlightRevision((value) => value + 1);
  }, []);

  const onToggle = useCallback(
    (key: string, currentlyOpen: boolean) => {
      setToggled((previous) => {
        const base = previous.fold === fold ? previous.map : emptyToggles;
        return { fold, map: toggleOpen(base, key, currentlyOpen) };
      });
    },
    [fold]
  );

  const renderEntry = useCallback(
    (entry: DiffEntry) => {
      const byDefault = foldOpenDefault(fold, isOpenByDefault(entry.file, patchFileKind(entry.file)));
      const open = effectiveOpen(overrides, entry.key, byDefault);
      return (
        <DiffFile
          cwd={cwd}
          file={entry.file}
          open={open}
          entryKey={entry.key}
          status={entry.status}
          language={entry.language}
          onToggle={onToggle}
          viewMode={viewMode}
          onHighlight={onHighlight}
          highlightRevision={highlightRevision}
        />
      );
    },
    [cwd, fold, overrides, onToggle, viewMode, onHighlight, highlightRevision]
  );

  return (
    <div class="flex min-w-0 flex-col font-mono text-sm leading-5 text-ink">
      {entryState.kind === 'parsing' && <Message text="Preparing diff" />}
      {ready && limited && <Message text="Diff too large to show." />}
      {ready && !limited && entries.length === 0 && <Message text="No diff to show." />}
      {ready && entries.length > 0 && (
        <Virtual items={entries} getKey={entryKey} renderItem={renderEntry} estimateHeight={estimateEntryHeight} />
      )}
    </div>
  );
};
