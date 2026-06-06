import type { GitChangesPayload, GitChangeSummary, GitPatchSection, GitPatchSectionKind } from '@preload/index';
import { useAppFocusState } from '@renderer/shared/app-focus';
import type { GitPatchState, GitPatchViewMode, GitSummaryState } from '@renderer/shared/workspace/changes/types';
import {
  type LoadedGitPatchState,
  type LoadedGitSummaryState,
  patchStateAfterPayload,
  resolvedGitPatchState,
  resolvedGitSummaryState,
  sameGitPatchState
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

const sameGitChangeSummary = (first: GitChangeSummary, second: GitChangeSummary) => {
  return (
    first.filesChanged === second.filesChanged &&
    first.insertions === second.insertions &&
    first.deletions === second.deletions
  );
};

const sameGitSummaryState = (first: GitSummaryState, second: GitSummaryState) => {
  if (first.kind !== second.kind) return false;
  if (first.kind !== 'ready' || second.kind !== 'ready') return true;
  return sameGitChangeSummary(first.summary, second.summary);
};

const sectionByKind = (sections: GitPatchSection[], kind: GitPatchSectionKind) =>
  sections.find((section) => section.kind === kind);

const summaryStateFromPayload = (payload: GitChangesPayload): GitSummaryState =>
  payload.summary ? { kind: 'ready', summary: payload.summary } : { kind: 'unavailable' };

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
          const nextGit: GitSummaryState = summary ? { kind: 'ready', summary } : { kind: 'unavailable' };
          if (active) {
            setGit((current) =>
              current.workspacePath === workspacePath && sameGitSummaryState(current.state, nextGit)
                ? current
                : { state: nextGit, workspacePath }
            );
          }
        })
        .catch(() => {
          if (active) {
            setGit((current) =>
              current.workspacePath === workspacePath && current.state.kind === 'unavailable'
                ? current
                : { state: { kind: 'unavailable' }, workspacePath }
            );
          }
        });
    };

    refreshGitChanges();
    const stopGitChanges = window.pi.app.onGitChangesChanged((payload) => {
      if (payload.workspacePath !== workspacePath) return;
      const nextGit = summaryStateFromPayload(payload);
      setGit((current) =>
        current.workspacePath === workspacePath && sameGitSummaryState(current.state, nextGit)
          ? current
          : { state: nextGit, workspacePath }
      );
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
          const nextState: GitPatchState = nextPatch ? { kind: 'ready', patch: nextPatch } : { kind: 'unavailable' };
          if (active) {
            setPatch((current) =>
              current.enabled === enabled &&
              current.workspacePath === workspacePath &&
              sameGitPatchState(current.state, nextState)
                ? current
                : { enabled, state: nextState, workspacePath }
            );
          }
        })
        .catch(() => {
          if (active) {
            setPatch((current) =>
              current.enabled === enabled &&
              current.workspacePath === workspacePath &&
              current.state.kind === 'unavailable'
                ? current
                : { enabled, state: { kind: 'unavailable' }, workspacePath }
            );
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
