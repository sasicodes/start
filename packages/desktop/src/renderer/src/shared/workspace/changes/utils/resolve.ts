import type { GitChangesPayload, GitPatch, GitPatchSection } from '@preload/index';
import type { GitPatchState, GitSummaryState } from '@renderer/shared/workspace/changes/types';

export interface LoadedGitSummaryState {
  state: GitSummaryState;
  workspacePath: string;
}

export interface LoadedGitPatchState {
  enabled: boolean;
  state: GitPatchState;
  workspacePath: string;
}

export const resolvedGitSummaryState = (git: LoadedGitSummaryState, workspacePath: string): GitSummaryState => {
  if (!workspacePath) return { kind: 'unavailable' };
  return git.workspacePath === workspacePath ? git.state : { kind: 'loading' };
};

export const resolvedGitPatchState = (
  patch: LoadedGitPatchState,
  workspacePath: string,
  enabled: boolean
): GitPatchState => {
  if (!workspacePath || !enabled) return { kind: 'idle' };
  return patch.enabled === enabled && patch.workspacePath === workspacePath ? patch.state : { kind: 'loading' };
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

export const sameGitPatchState = (first: GitPatchState, second: GitPatchState) => {
  if (first.kind !== second.kind) return false;
  if (first.kind !== 'ready' || second.kind !== 'ready') return true;
  return sameGitPatch(first.patch, second.patch);
};

const patchStateFromPayload = (payload: GitChangesPayload): GitPatchState | null => {
  if (payload.patch) return { kind: 'ready', patch: payload.patch };
  return payload.patchUnavailable ? { kind: 'unavailable' } : null;
};

export const patchStateAfterPayload = (
  current: LoadedGitPatchState,
  workspacePath: string,
  enabled: boolean,
  payload: GitChangesPayload
): LoadedGitPatchState => {
  if (payload.workspacePath !== workspacePath) return current;

  const nextState = patchStateFromPayload(payload);
  if (!nextState) return current;

  return current.enabled === enabled &&
    current.workspacePath === workspacePath &&
    sameGitPatchState(current.state, nextState)
    ? current
    : { enabled, state: nextState, workspacePath };
};
