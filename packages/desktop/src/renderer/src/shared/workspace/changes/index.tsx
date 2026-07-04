import { useAppFocusState } from '@renderer/shared/app-focus';
import { PanelCloseButton } from '@renderer/shared/panel/close';
import { hasGitDiff } from '@renderer/shared/workspace/changes/controls';
import { requestDiffFold } from '@renderer/shared/workspace/changes/diff/fold';
import type { DiffViewMode } from '@renderer/shared/workspace/changes/diff/types';
import {
  useGitPatch,
  gitViewLabel,
  nextViewMode,
  useGitChanges,
  emptyGitSummary,
  gitChangesLabel,
  availableViewModes,
  sectionsForViewMode,
  type GitPatchViewMode,
  summaryForViewMode
} from '@renderer/shared/workspace/changes/state';
import { ChangesIcon, CollapseAllIcon, CycleVerticalIcon, DiffSplitIcon, ExpandAllIcon } from '@renderer/ui/icons';
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

const gitChangesMaxWidthRatio = 0.7;
const loadGitDiffViewer = () =>
  import('@renderer/shared/workspace/changes/diff').then((module) => ({ default: module.GitDiffViewer }));
const GitDiffViewer = lazy(loadGitDiffViewer);

interface GitChangesProps {
  path: string;
  open?: boolean;
  onToggle: () => void;
}

interface GitChangesPanelProps {
  path: string;
  onClose: () => void;
}

interface GitSummaryLike {
  deletions: number;
  insertions: number;
  filesChanged: number;
}

interface DiffReadyState {
  path: string;
  ready: boolean;
}

const EmptyDiff = ({ message }: { message: string }) => (
  <div class="grid flex-1 place-items-center px-4 text-sm leading-6 text-soft">{message}</div>
);

const summaryFromSections = (sections: GitSummaryLike[]) =>
  sections.reduce(
    (summary, section) => ({
      deletions: summary.deletions + section.deletions,
      insertions: summary.insertions + section.insertions,
      filesChanged: summary.filesChanged + section.filesChanged
    }),
    emptyGitSummary
  );

export const GitChanges = memo(({ open = false, path, onToggle }: GitChangesProps) => {
  const git = useGitChanges(path);
  const appFocused = useAppFocusState();
  if (git.kind !== 'ready' || git.summary.filesChanged === 0) return null;

  const summary = git.summary;
  const label = gitChangesLabel(summary.filesChanged);

  return (
    <Tooltip label={label}>
      <motion.button
        type="button"
        animate={appFocused ? bottomBubbleVisibleMotion : bottomBubbleHiddenMotion}
        aria-expanded={open}
        aria-label={`${open ? 'Hide' : 'Show'} git changes, ${label}`}
        initial={bottomBubbleHiddenMotion}
        onClick={onToggle}
        style={{ maxWidth: `${gitChangesMaxWidthRatio * 100}vw` }}
        transition={appFocused ? bottomBubbleRevealTransition : bottomBubbleHideTransition}
        class={tw(
          'flex h-11.5 shrink-0 items-center gap-2 overflow-hidden rounded-full border-0 bg-composer px-5 text-sm leading-none font-medium text-soft shadow-shell outline-0 transition-[background-color,width,padding] duration-75 ease-out select-none hover:bg-control focus-visible:bg-control @max-workspace-dock/chat:size-11.5 @max-workspace-dock/chat:justify-center @max-workspace-dock/chat:p-0 @max-workspace-dock/chat:text-ink',
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

export const GitChangesPanel = memo(({ path, onClose }: GitChangesPanelProps) => {
  const [diffReady, setDiffReady] = useState<DiffReadyState>({ path, ready: false });
  const [viewMode, setViewMode] = useState<GitPatchViewMode>('all');
  const [allCollapsed, setAllCollapsed] = useState(false);
  const [diffViewMode, setDiffViewMode] = useState<DiffViewMode>('unified');
  const ready = diffReady.path === path && diffReady.ready;
  const patch = useGitPatch(path, Boolean(path && ready));

  useEffect(() => {
    setAllCollapsed(false);
    const timer = window.setTimeout(() => setDiffReady({ path, ready: true }), 190);
    return () => window.clearTimeout(timer);
  }, [path]);

  const toggleFoldAll = () => {
    requestDiffFold(allCollapsed ? 'expand' : 'collapse');
    setAllCollapsed((collapsed) => !collapsed);
  };

  useEffect(() => {
    if (patch.kind !== 'ready' || patch.patch.sections.length === 0) return;
    void loadGitDiffViewer();
  }, [patch]);

  const availableModes = patch.kind === 'ready' ? availableViewModes(patch.patch.sections) : ['all'];
  const effectiveViewMode = availableModes.includes(viewMode) ? viewMode : 'all';

  const visibleSections = useMemo(
    () => (patch.kind === 'ready' ? sectionsForViewMode(patch.patch.sections, effectiveViewMode) : []),
    [effectiveViewMode, patch]
  );
  const patchSummary = patch.kind === 'ready' ? summaryFromSections(patch.patch.sections) : emptyGitSummary;
  const visibleSummary =
    patch.kind === 'ready'
      ? summaryForViewMode(patchSummary, patch.patch.sections, effectiveViewMode)
      : emptyGitSummary;
  const splitDiffView = diffViewMode === 'split';
  const hasVisibleDiff = hasGitDiff(visibleSummary);
  const canCycle = patch.kind === 'ready' && availableModes.length > 1;

  return (
    <div class="flex min-h-full flex-col outline-0">
      {patch.kind === 'ready' && (
        <header class="flex items-center justify-between gap-3 px-4 py-4 text-sm leading-6 font-medium">
          <div class="flex min-w-0 items-center gap-3">
            <button
              type="button"
              disabled={!canCycle}
              onClick={() => setViewMode((current) => nextViewMode(current, patch.patch.sections))}
              class={tw(
                'inline-flex min-w-0 items-center gap-1.5 truncate border-0 bg-transparent p-0 text-left text-soft outline-0',
                canCycle && 'transition-colors hover:text-hover focus-visible:text-hover'
              )}
            >
              <span class="min-w-0 truncate">{gitViewLabel(effectiveViewMode, visibleSummary.filesChanged)}</span>
              {canCycle && <CycleVerticalIcon class="size-3.5 flex-none" />}
            </button>
            {hasVisibleDiff && (
              <button
                type="button"
                aria-pressed={!splitDiffView}
                aria-label={splitDiffView ? 'Show unified diff' : 'Show split diff'}
                onClick={() => setDiffViewMode((mode) => (mode === 'split' ? 'unified' : 'split'))}
                class="group/diff-view relative inline-flex size-4 flex-none items-center justify-center border-0 bg-transparent p-0 text-soft outline-0 transition-colors before:absolute before:-inset-2 before:rounded-full before:content-[''] hover:text-hover focus-visible:text-hover [&_svg]:block [&_svg]:size-4"
              >
                <DiffSplitIcon class={tw('transition-transform duration-100 ease-out', splitDiffView && 'rotate-90')} />
              </button>
            )}
            {hasVisibleDiff && (
              <Tooltip label={allCollapsed ? 'Expand all files' : 'Collapse all files'}>
                <button
                  type="button"
                  onClick={toggleFoldAll}
                  aria-label={allCollapsed ? 'Expand all files' : 'Collapse all files'}
                  class="relative inline-flex size-4 flex-none items-center justify-center border-0 bg-transparent p-0 text-soft outline-0 transition-colors before:absolute before:-inset-2 before:rounded-full before:content-[''] hover:text-hover focus-visible:text-hover [&_svg]:block [&_svg]:size-4"
                >
                  {allCollapsed ? <ExpandAllIcon /> : <CollapseAllIcon />}
                </button>
              </Tooltip>
            )}
          </div>
          <div class="flex items-center gap-3 font-medium">
            {hasVisibleDiff && (
              <div class="flex items-center gap-2">
                <span class="tabular-nums text-success">+{visibleSummary.insertions}</span>
                <span class="tabular-nums text-danger">-{visibleSummary.deletions}</span>
              </div>
            )}
            <PanelCloseButton onClick={onClose} />
          </div>
        </header>
      )}
      {patch.kind === 'loading' && <EmptyDiff message="Preparing diff" />}
      {patch.kind === 'unavailable' && <EmptyDiff message="No diff to show." />}
      {patch.kind === 'ready' && patch.patch.sections.length === 0 && <EmptyDiff message="No diff to show." />}
      {patch.kind === 'ready' && patch.patch.sections.length > 0 && (
        <div class="min-w-0 pb-4">
          <Suspense fallback={<p class="m-0 px-4 text-sm leading-6 text-soft">Preparing diff</p>}>
            <GitDiffViewer cwd={path} viewMode={diffViewMode} sections={visibleSections} />
          </Suspense>
        </div>
      )}
    </div>
  );
});
