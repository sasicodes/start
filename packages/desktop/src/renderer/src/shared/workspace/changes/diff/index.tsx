import type { GitPatchSection } from '@preload/index';
import { entriesFromResults } from '@renderer/shared/workspace/changes/diff/entries';
import { estimatedFileHeight, isOpenByDefault } from '@renderer/shared/workspace/changes/diff/estimate';
import { DiffFile } from '@renderer/shared/workspace/changes/diff/file';
import { runDiffHighlighting } from '@renderer/shared/workspace/changes/diff/highlight';
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

const useDiffEntries = (sections: GitPatchSection[]) => {
  const [entryState, setEntryState] = useState<DiffEntriesState>({ kind: 'parsing' });
  const workerRef = useRef<Worker | null>(null);
  const jobIdRef = useRef(0);

  useEffect(() => {
    if (!workerRef.current) workerRef.current = createParserWorker();
    jobIdRef.current += 1;
    setEntryState((current) => (current.kind === 'parsing' ? current : { kind: 'parsing' }));

    return postParseJob(workerRef.current, jobIdRef.current, sections, (entries) =>
      setEntryState({ entries, kind: 'ready' })
    );
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
    return runDiffHighlighting(entryState.entries, () => setHighlightRevision((value) => value + 1));
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
  const ready = entryState.kind === 'ready';
  const entries = ready ? entryState.entries : [];
  const highlightRevision = useDiffHighlighting(entryState);
  const limited = sections.some((section) => section.limited && !section.patch);
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
          file={entry.file}
          onToggle={onToggle}
          viewMode={viewMode}
          entryKey={entry.key}
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
      {entryState.kind === 'parsing' && <Message text="Preparing diff" />}
      {ready && limited && <Message text="Diff too large to show." />}
      {ready && !limited && entries.length === 0 && <Message text="No diff to show." />}
      {ready && entries.length > 0 && (
        <Virtual items={entries} getKey={entryKey} renderItem={renderEntry} estimateHeight={estimateEntryHeight} />
      )}
    </div>
  );
};
