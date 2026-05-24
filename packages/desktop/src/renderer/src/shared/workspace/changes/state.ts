import type { GitChangeSummary, GitPatch, GitPatchSection, GitPatchSectionKind } from '@preload/index';
import { useAppFocusState } from '@renderer/shared/app-focus';
import { useEffect, useState } from 'preact/hooks';

export type GitSummaryState =
  | { kind: 'loading' }
  | { kind: 'ready'; summary: GitChangeSummary }
  | { kind: 'unavailable' };

export type GitPatchState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; patch: GitPatch }
  | { kind: 'unavailable' };

export type GitPatchViewMode = 'all' | GitPatchSectionKind;

const gitRefreshIntervalMs = 3500;
const gitSectionOrder: GitPatchSectionKind[] = ['unstaged', 'untracked'];

export const emptyGitSummary: GitChangeSummary = { deletions: 0, filesChanged: 0, insertions: 0 };

const gitFilesLabel = (filesChanged: number) => (filesChanged === 1 ? '1 file' : `${filesChanged} files`);
const gitFileChangesLabel = (filesChanged: number) =>
  filesChanged === 1 ? '1 file change' : `${filesChanged} file changes`;

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

const sameGitPatchSection = (first: GitPatchSection, second: GitPatchSection) => {
  return (
    first.kind === second.kind &&
    first.patch === second.patch &&
    first.filesChanged === second.filesChanged &&
    first.insertions === second.insertions &&
    first.deletions === second.deletions &&
    first.limited === second.limited
  );
};

const sameGitPatch = (first: GitPatch, second: GitPatch) => {
  if (first.sections.length !== second.sections.length) return false;
  return first.sections.every((section, index) => {
    const nextSection = second.sections[index];
    return nextSection ? sameGitPatchSection(section, nextSection) : false;
  });
};

const sameGitPatchState = (first: GitPatchState, second: GitPatchState) => {
  if (first.kind !== second.kind) return false;
  if (first.kind !== 'ready' || second.kind !== 'ready') return true;
  return sameGitPatch(first.patch, second.patch);
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

export const useGitChanges = (workspacePath: string) => {
  const [git, setGit] = useState<GitSummaryState>({ kind: 'loading' });
  const appFocused = useAppFocusState(Boolean(workspacePath));

  useEffect(() => {
    let active = true;

    if (!workspacePath) {
      setGit({ kind: 'unavailable' });
      return () => {
        active = false;
      };
    }

    if (!appFocused) {
      return () => {
        active = false;
      };
    }

    setGit((current) => (current.kind === 'ready' ? current : { kind: 'loading' }));
    const refreshGitChanges = () => {
      void window.pi.app
        .gitChanges(workspacePath)
        .then((summary) => {
          const nextGit: GitSummaryState = summary ? { kind: 'ready', summary } : { kind: 'unavailable' };
          if (active) setGit((current) => (sameGitSummaryState(current, nextGit) ? current : nextGit));
        })
        .catch(() => {
          if (active) setGit((current) => (current.kind === 'unavailable' ? current : { kind: 'unavailable' }));
        });
    };

    refreshGitChanges();
    const interval = window.setInterval(refreshGitChanges, gitRefreshIntervalMs);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [appFocused, workspacePath]);

  return git;
};

export const useGitPatch = (workspacePath: string, enabled: boolean) => {
  const [patch, setPatch] = useState<GitPatchState>({ kind: 'idle' });
  const appFocused = useAppFocusState(Boolean(workspacePath && enabled));

  useEffect(() => {
    let active = true;

    if (!workspacePath || !enabled) {
      setPatch({ kind: 'idle' });
      return () => {
        active = false;
      };
    }

    if (!appFocused) {
      return () => {
        active = false;
      };
    }

    setPatch((current) => (current.kind === 'ready' ? current : { kind: 'loading' }));
    const refreshGitPatch = () => {
      void window.pi.app
        .gitPatch(workspacePath)
        .then((nextPatch) => {
          const nextState: GitPatchState = nextPatch ? { kind: 'ready', patch: nextPatch } : { kind: 'unavailable' };
          if (active) setPatch((current) => (sameGitPatchState(current, nextState) ? current : nextState));
        })
        .catch(() => {
          if (active) setPatch((current) => (current.kind === 'unavailable' ? current : { kind: 'unavailable' }));
        });
    };

    refreshGitPatch();
    const interval = window.setInterval(refreshGitPatch, gitRefreshIntervalMs);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [appFocused, enabled, workspacePath]);

  return patch;
};
