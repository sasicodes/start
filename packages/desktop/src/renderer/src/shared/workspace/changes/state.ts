import type { GitChangeSummary, GitPatchSection, GitPatchSectionKind } from '@preload/index';
import { useAppFocusState } from '@renderer/shared/app-focus';
import type { GitPatchState, GitPatchViewMode, GitSummaryState } from '@renderer/shared/workspace/changes/types';
import {
  type LoadedGitPatchState,
  type LoadedGitSummaryState,
  patchStateAfterPayload,
  patchStateAfterResult,
  patchStateFromResult,
  resolvedGitPatchState,
  resolvedGitSummaryState,
  summaryStateAfterPayload,
  summaryStateAfterResult,
  summaryStateFromResult
} from '@renderer/shared/workspace/changes/utils/resolve';
import { useEffect, useState } from 'preact/hooks';

export type { GitPatchState, GitPatchViewMode, GitSummaryState } from '@renderer/shared/workspace/changes/types';

const gitSectionOrder: GitPatchSectionKind[] = ['unstaged', 'untracked'];

export const emptyGitSummary: GitChangeSummary = { deletions: 0, filesChanged: 0, insertions: 0 };

const gitFilesLabel = (filesChanged: number) => (filesChanged === 1 ? '1 file' : `${filesChanged} files`);
const gitFileChangesLabel = (filesChanged: number) => {
  if (filesChanged === 0) return 'file changes';
  return filesChanged === 1 ? '1 file change' : `${filesChanged} file changes`;
};

const gitSectionLabel = (kind: GitPatchSectionKind) => {
  switch (kind) {
    case 'staged':
      return 'staged';
    case 'unstaged':
      return 'unstaged';
    case 'untracked':
      return 'untracked';
  }
};

const sectionByKind = (sections: GitPatchSection[], kind: GitPatchSectionKind) =>
  sections.find((section) => section.kind === kind);

export const gitChangesLabel = (filesChanged: number) => `${gitFilesLabel(filesChanged)} changed`;

export const gitViewLabel = (mode: GitPatchViewMode, filesChanged: number) => {
  if (mode === 'all') return `All ${gitFileChangesLabel(filesChanged)}`;
  return `${filesChanged} ${gitSectionLabel(mode)} ${filesChanged === 1 ? 'file change' : 'file changes'}`;
};

export const availableViewModes = (sections: GitPatchSection[]): GitPatchViewMode[] => [
  'all',
  ...gitSectionOrder.filter((kind) => sectionByKind(sections, kind))
];

export const nextViewMode = (current: GitPatchViewMode, sections: GitPatchSection[]) => {
  const modes = availableViewModes(sections);
  const index = modes.indexOf(current);
  return modes[(index + 1) % modes.length] ?? 'all';
};

export const sectionsForViewMode = (sections: GitPatchSection[], mode: GitPatchViewMode) => {
  if (mode === 'all') return sections;
  const section = sectionByKind(sections, mode);
  return section ? [section] : [];
};

export const summaryForViewMode = (summary: GitChangeSummary, sections: GitPatchSection[], mode: GitPatchViewMode) => {
  if (mode === 'all') return summary;
  return sectionByKind(sections, mode) ?? emptyGitSummary;
};

export const useGitChanges = (workspacePath: string): GitSummaryState => {
  const [git, setGit] = useState<LoadedGitSummaryState>({
    state: workspacePath ? { kind: 'loading' } : { kind: 'unavailable' },
    workspacePath
  });
  const appFocused = useAppFocusState(Boolean(workspacePath));

  useEffect(() => {
    let active = true;

    if (!workspacePath) return;

    if (!appFocused) {
      return () => {
        active = false;
      };
    }

    const refreshGitChanges = () => {
      window.pi.app
        .gitChanges(workspacePath)
        .then((summary) => {
          const nextState = summaryStateFromResult(summary);
          if (active) {
            setGit((current) => summaryStateAfterResult(current, workspacePath, nextState));
          }
        })
        .catch(() => {
          if (active) {
            setGit((current) => summaryStateAfterResult(current, workspacePath, { kind: 'unavailable' }));
          }
        });
    };

    refreshGitChanges();
    const stopGitChanges = window.pi.app.onGitChangesChanged((payload) => {
      setGit((current) => summaryStateAfterPayload(current, workspacePath, payload));
    });
    return () => {
      active = false;
      stopGitChanges();
    };
  }, [appFocused, workspacePath]);

  return resolvedGitSummaryState(git, workspacePath);
};

export const useGitPatch = (workspacePath: string, enabled: boolean): GitPatchState => {
  const [patch, setPatch] = useState<LoadedGitPatchState>({
    enabled,
    state: workspacePath && enabled ? { kind: 'loading' } : { kind: 'idle' },
    workspacePath
  });
  const appFocused = useAppFocusState(Boolean(workspacePath && enabled));

  useEffect(() => {
    let active = true;

    if (!workspacePath || !enabled) return;

    if (!appFocused) {
      return () => {
        active = false;
      };
    }

    const refreshGitPatch = () => {
      window.pi.app
        .gitPatch(workspacePath)
        .then((nextPatch) => {
          const nextState = patchStateFromResult(nextPatch);
          if (active) {
            setPatch((current) => patchStateAfterResult(current, workspacePath, enabled, nextState));
          }
        })
        .catch(() => {
          if (active) {
            setPatch((current) => patchStateAfterResult(current, workspacePath, enabled, { kind: 'unavailable' }));
          }
        });
    };

    refreshGitPatch();
    const stopGitChanges = window.pi.app.onGitChangesChanged((payload) => {
      setPatch((current) => patchStateAfterPayload(current, workspacePath, enabled, payload));
    });
    return () => {
      active = false;
      stopGitChanges();
    };
  }, [appFocused, enabled, workspacePath]);

  return resolvedGitPatchState(patch, workspacePath, enabled);
};
