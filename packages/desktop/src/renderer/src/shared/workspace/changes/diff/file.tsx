import { fileHasTextDiff, isTooLargeToShow } from '@renderer/shared/workspace/changes/diff/estimate';
import { DiffHunks } from '@renderer/shared/workspace/changes/diff/hunk';
import { ImageDiff } from '@renderer/shared/workspace/changes/diff/image';
import { patchFileKind, type PatchFileKind } from '@renderer/shared/workspace/changes/diff/kind';
import type { PatchFile } from '@renderer/shared/workspace/changes/diff/parser';
import { Reveal } from '@renderer/shared/workspace/changes/diff/reveal';
import type { DiffFileStatus, DiffViewMode } from '@renderer/shared/workspace/changes/diff/types';
import { ArrowUpIcon, ChevronDownIcon } from '@renderer/ui/icons';
import { tw } from '@renderer/utils/tw';
import { memo } from 'preact/compat';

interface DiffFileProps {
  cwd: string;
  open: boolean;
  file: PatchFile;
  entryKey: string;
  language: string;
  status: DiffFileStatus;
  viewMode: DiffViewMode;
  highlightRevision: number;
  onToggle: (entryKey: string, currentlyOpen: boolean) => void;
}

interface FileProps {
  file: PatchFile;
}

interface StatusMarkProps {
  status: DiffFileStatus;
}

const statusLabels: Record<DiffFileStatus, string> = {
  added: 'added',
  copied: 'copied',
  deleted: 'deleted',
  modified: 'modified',
  renamed: 'renamed',
  untracked: 'untracked'
};

const StatusMark = ({ status }: StatusMarkProps) => (
  <svg
    role="img"
    fill="none"
    viewBox="0 0 24 24"
    title={statusLabels[status]}
    aria-label={statusLabels[status]}
    class={tw(
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

const fileHasPathChange = (file: PatchFile) => Boolean(file.oldPath && file.newPath && file.oldPath !== file.newPath);

const fallbackMessage = (file: PatchFile, kind: PatchFileKind) => {
  if (kind === 'submodule') return 'Submodule pointer changed.';
  if (kind === 'symlink') return 'Symlink target changed.';
  if (kind === 'mode-only') return `Permissions changed (${file.oldMode} → ${file.newMode}).`;
  if (file.isBinary) return 'Binary file changed.';
  if (isTooLargeToShow(file)) return 'File too large to show.';
  if (fileHasPathChange(file)) return 'File renamed without changes.';
  return 'No text diff to show.';
};

const FileStats = ({ file }: FileProps) => {
  if (file.added === 0 && file.removed === 0) return null;

  return (
    <div class="flex flex-none items-center gap-2 text-xs leading-4 font-medium tabular-nums">
      <span class="text-success">+{file.added}</span>
      <span class="text-danger">-{file.removed}</span>
    </div>
  );
};

const PathChange = ({ file }: FileProps) => (
  <span class="inline-flex min-w-0 items-center gap-1.5 text-sm leading-5 font-medium">
    <span class="min-w-0 truncate text-soft">{file.oldPath}</span>
    <ArrowUpIcon class="size-3 flex-none rotate-90 text-soft" strokeWidth={2} />
    <span class="min-w-0 truncate text-ink">{file.newPath}</span>
  </span>
);

const FileTitle = ({ file }: FileProps) =>
  fileHasPathChange(file) ? (
    <PathChange file={file} />
  ) : (
    <span class="min-w-0 truncate text-sm leading-5 font-medium text-ink">{file.displayPath}</span>
  );

const FallbackDiff = ({ cwd, file, kind }: { cwd: string; file: PatchFile; kind: PatchFileKind }) => (
  <div class="flex flex-wrap items-center justify-center gap-2 px-4 py-4 font-sans text-sm leading-6 text-soft">
    <span>{fallbackMessage(file, kind)}</span>
    <Reveal cwd={cwd} filePath={file.newPath || file.oldPath} />
  </div>
);

interface DiffBodyProps {
  cwd: string;
  file: PatchFile;
  language: string;
  kind: PatchFileKind;
  status: DiffFileStatus;
  viewMode: DiffViewMode;
  highlightRevision: number;
}

const DiffBody = ({ cwd, file, kind, status, language, viewMode, highlightRevision }: DiffBodyProps) => {
  if (kind === 'image') return <ImageDiff cwd={cwd} file={file} status={status} />;
  if (fileHasTextDiff(file) && !isTooLargeToShow(file))
    return <DiffHunks file={file} language={language} viewMode={viewMode} highlightRevision={highlightRevision} />;
  return <FallbackDiff cwd={cwd} file={file} kind={kind} />;
};

export const DiffFile = memo(
  ({ cwd, file, open, status, entryKey, language, onToggle, viewMode, highlightRevision }: DiffFileProps) => {
    const kind = patchFileKind(file);

    return (
      <section class="min-w-0 border-t border-line">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => onToggle(entryKey, open)}
          class="group/file flex w-full min-w-0 items-center justify-between gap-3 border-0 bg-transparent px-4 py-2.5 text-left outline-0 transition-colors hover:text-hover focus-visible:text-hover"
        >
          <div class="flex min-w-0 items-center gap-2">
            <StatusMark status={status} />
            <FileTitle file={file} />
          </div>
          <div class="flex flex-none items-center gap-3">
            <FileStats file={file} />
            <ChevronDownIcon
              class={tw(
                'size-3.5 flex-none text-soft transition-[color,transform] duration-100 ease-out group-hover/file:text-hover group-focus-visible/file:text-hover',
                !open && '-rotate-90'
              )}
            />
          </div>
        </button>
        {open && (
          <DiffBody
            cwd={cwd}
            file={file}
            kind={kind}
            status={status}
            language={language}
            viewMode={viewMode}
            highlightRevision={highlightRevision}
          />
        )}
      </section>
    );
  }
);
