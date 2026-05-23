import { DiffHunks } from '@renderer/shared/workspace/changes/diff/hunk';
import type { PatchFile } from '@renderer/shared/workspace/changes/diff/parser';
import type { DiffFileStatus, DiffViewMode } from '@renderer/shared/workspace/changes/diff/types';
import { ChevronDownIcon } from '@renderer/ui/icons';
import { cn } from '@renderer/utils/cn';
import { memo } from 'preact/compat';
import { useState } from 'preact/hooks';

interface DiffFileProps {
  file: PatchFile;
  highlightRevision: number;
  language: string;
  status: DiffFileStatus;
  viewMode: DiffViewMode;
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

const FileStats = ({ file }: FileProps) => {
  if (file.added === 0 && file.removed === 0) return null;

  return (
    <div class="flex flex-none items-center gap-2 text-xs leading-4 font-medium tabular-nums">
      <span class="text-success">+{file.added}</span>
      <span class="text-danger">-{file.removed}</span>
    </div>
  );
};

const EmptyFileDiff = ({ file }: FileProps) => (
  <p class="m-0 px-4 py-2 text-sm leading-6 text-soft">
    {file.isBinary ? 'Binary file changed.' : 'No text diff to show.'}
  </p>
);

export const DiffFile = memo(({ file, highlightRevision, language, status, viewMode }: DiffFileProps) => {
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
              'size-3.5 flex-none text-soft transition-[color,transform] duration-100 ease-out group-hover/file:text-hover group-focus-visible/file:text-hover',
              !open && '-rotate-90'
            )}
          />
        </div>
      </button>
      {open && file.hunks.length === 0 && <EmptyFileDiff file={file} />}
      {open && <DiffHunks file={file} language={language} viewMode={viewMode} highlightRevision={highlightRevision} />}
    </section>
  );
});
