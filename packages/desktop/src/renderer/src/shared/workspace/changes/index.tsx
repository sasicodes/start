import { useAppFocusState } from '@renderer/shared/app-focus';
import { ChangesIcon, CycleVerticalIcon, DiffSplitIcon } from '@renderer/ui/icons';
import {
  bottomBubbleHiddenMotion,
  bottomBubbleHideTransition,
  bottomBubbleRevealTransition,
  bottomBubbleVisibleMotion
} from '@renderer/ui/motion';
import { Tooltip } from '@renderer/ui/tooltip';
import { tw } from '@renderer/utils/tw';
import { motion } from 'motion/react';
import { lazy, memo, Suspense } from 'preact/compat';
import { useEffect, useMemo, useState } from 'preact/hooks';
import {
  availableViewModes,
  emptyGitSummary,
  gitChangesLabel,
  gitViewLabel,
  nextViewMode,
  sectionsForViewMode,
  summaryForViewMode,
  type GitPatchViewMode,
  useGitChanges,
  useGitPatch
} from '@renderer/shared/workspace/changes/state';
import type { DiffViewMode } from '@renderer/shared/workspace/changes/diff/types';

const gitChangesBadgeMaxWidthRatio = 0.7;
const loadGitDiffViewer = () =>
  import('@renderer/shared/workspace/changes/diff').then((module) => ({ default: module.GitDiffViewer }));
const GitDiffViewer = lazy(loadGitDiffViewer);

interface GitChangesBadgeProps {
  expanded?: boolean;
  workspacePath: string;
  onTogglePanel: () => void;
}

interface GitChangesPanelProps {
  workspacePath: string;
}

interface GitSummaryLike {
  deletions: number;
  insertions: number;
  filesChanged: number;
}

const summaryFromSections = (sections: GitSummaryLike[]) =>
  sections.reduce(
    (summary, section) => ({
      deletions: summary.deletions + section.deletions,
      insertions: summary.insertions + section.insertions,
      filesChanged: summary.filesChanged + section.filesChanged
    }),
    emptyGitSummary
  );

export const GitChangesBadge = memo(({ expanded = false, workspacePath, onTogglePanel }: GitChangesBadgeProps) => {
  const git = useGitChanges(workspacePath);
  const appFocused = useAppFocusState();
  if (git.kind !== 'ready' || git.summary.filesChanged === 0) return null;

  const label = gitChangesLabel(git.summary.filesChanged);
  const summary = git.summary;

  return (
    <Tooltip label={label}>
      <motion.button
        type="button"
        animate={appFocused ? bottomBubbleVisibleMotion : bottomBubbleHiddenMotion}
        aria-expanded={expanded}
        aria-label={`${expanded ? 'Hide' : 'Show'} git changes, ${label}`}
        initial={bottomBubbleHiddenMotion}
        onClick={onTogglePanel}
        style={{ maxWidth: `${gitChangesBadgeMaxWidthRatio * 100}vw` }}
        transition={appFocused ? bottomBubbleRevealTransition : bottomBubbleHideTransition}
        class={tw(
          'flex h-11.5 shrink-0 items-center gap-2 overflow-hidden rounded-full border-0 bg-composer px-5 text-xs leading-none font-semibold text-soft shadow-shell outline-0 transition-[background-color,width,padding] duration-75 ease-out select-none hover:bg-control focus-visible:bg-control @max-workspace-dock/chat:size-11.5 @max-workspace-dock/chat:justify-center @max-workspace-dock/chat:p-0 @max-workspace-dock/chat:text-ink',
          !appFocused && 'pointer-events-none'
        )}
      >
        <ChangesIcon class="hidden size-5 flex-none @max-workspace-dock/chat:block" />
        <span class="flex min-w-0 items-center gap-2 @max-workspace-dock/chat:hidden">
          <span class="tabular-nums text-success">+{summary.insertions}</span>
          <span class="tabular-nums text-danger">-{summary.deletions}</span>
        </span>
      </motion.button>
    </Tooltip>
  );
});

export const GitChangesPanel = memo(({ workspacePath }: GitChangesPanelProps) => {
  const [diffReady, setDiffReady] = useState(false);
  const [diffViewMode, setDiffViewMode] = useState<DiffViewMode>('split');
  const [viewMode, setViewMode] = useState<GitPatchViewMode>('all');
  const patch = useGitPatch(workspacePath, Boolean(workspacePath && diffReady));

  useEffect(() => {
    setDiffReady(false);
    const timer = window.setTimeout(() => setDiffReady(true), 190);
    return () => window.clearTimeout(timer);
  }, [workspacePath]);

  useEffect(() => {
    if (patch.kind !== 'ready' || patch.patch.sections.length === 0) return;
    void loadGitDiffViewer();
  }, [patch]);

  useEffect(() => {
    if (patch.kind !== 'ready') {
      setViewMode('all');
      return;
    }

    if (!availableViewModes(patch.patch.sections).includes(viewMode)) setViewMode('all');
  }, [patch, viewMode]);

  const visibleSections = useMemo(
    () => (patch.kind === 'ready' ? sectionsForViewMode(patch.patch.sections, viewMode) : []),
    [patch, viewMode]
  );
  const patchSummary = patch.kind === 'ready' ? summaryFromSections(patch.patch.sections) : emptyGitSummary;
  const visibleSummary =
    patch.kind === 'ready' ? summaryForViewMode(patchSummary, patch.patch.sections, viewMode) : emptyGitSummary;
  const canCycle = patch.kind === 'ready' && availableViewModes(patch.patch.sections).length > 1;
  const splitDiffView = diffViewMode === 'split';

  return (
    <div class="flex min-h-full flex-col gap-4 outline-0">
      {patch.kind === 'ready' && (
        <header class="flex items-center justify-between gap-3 px-4 pt-4 text-sm leading-6 font-medium">
          <button
            type="button"
            disabled={!canCycle}
            onClick={() => setViewMode((current) => nextViewMode(current, patch.patch.sections))}
            class={tw(
              'inline-flex min-w-0 items-center gap-1.5 truncate border-0 bg-transparent p-0 text-left text-soft outline-0',
              canCycle && 'transition-colors hover:text-hover focus-visible:text-hover'
            )}
          >
            <span class="min-w-0 truncate">{gitViewLabel(viewMode, visibleSummary.filesChanged)}</span>
            {canCycle && <CycleVerticalIcon class="size-3.5 flex-none" />}
          </button>
          <div class="flex items-center gap-3 font-medium">
            <div class="flex items-center gap-2">
              <span class="tabular-nums text-success">+{visibleSummary.insertions}</span>
              <span class="tabular-nums text-danger">-{visibleSummary.deletions}</span>
            </div>
            <button
              type="button"
              aria-pressed={!splitDiffView}
              aria-label={splitDiffView ? 'Show unified diff' : 'Show split diff'}
              onClick={() => setDiffViewMode((mode) => (mode === 'split' ? 'unified' : 'split'))}
              class="group/diff-view inline-flex size-4 flex-none items-center justify-center border-0 bg-transparent p-0 text-soft outline-0 transition-colors hover:text-hover focus-visible:text-hover [&_svg]:block [&_svg]:size-4"
            >
              <DiffSplitIcon class={tw('transition-transform duration-100 ease-out', !splitDiffView && 'rotate-90')} />
            </button>
          </div>
        </header>
      )}
      {patch.kind === 'loading' && <p class="m-0 px-4 pt-4 text-sm leading-6 text-soft">Preparing diff...</p>}
      {patch.kind === 'unavailable' && <p class="m-0 px-4 text-sm leading-6 text-soft">No diff to show.</p>}
      {patch.kind === 'ready' && patch.patch.sections.length === 0 && (
        <p class="m-0 px-4 text-sm leading-6 text-soft">No diff to show.</p>
      )}
      {patch.kind === 'ready' && patch.patch.sections.length > 0 && (
        <div class="min-w-0 pb-4">
          <Suspense fallback={<p class="m-0 px-4 text-sm leading-6 text-soft">Preparing diff…</p>}>
            <GitDiffViewer sections={visibleSections} viewMode={diffViewMode} />
          </Suspense>
        </div>
      )}
    </div>
  );
});
