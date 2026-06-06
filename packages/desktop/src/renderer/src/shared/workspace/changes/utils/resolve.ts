import type { GitChangesPayload, GitChangeSummary, GitPatch, GitPatchSection } from '@preload/index';
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

const sameGitChangeSummary = (first: GitChangeSummary, second: GitChangeSummary) => {
  return (
    first.filesChanged === second.filesChanged &&
    first.insertions === second.insertions &&
    first.deletions === second.deletions
  );
};

export const sameGitSummaryState = (first: GitSummaryState, second: GitSummaryState) => {
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

export const sameGitPatchState = (first: GitPatchState, second: GitPatchState) => {
  if (first.kind !== second.kind) return false;
  if (first.kind !== 'ready' || second.kind !== 'ready') return true;
  return sameGitPatch(first.patch, second.patch);
};

export const summaryStateFromResult = (summary?: GitChangeSummary | null): GitSummaryState =>
  summary ? { kind: 'ready', summary } : { kind: 'unavailable' };

export const patchStateFromResult = (patch?: GitPatch | null): GitPatchState =>
  patch ? { kind: 'ready', patch } : { kind: 'unavailable' };

const patchStateFromPayload = (payload: GitChangesPayload): GitPatchState | null => {
  if (payload.patch) return { kind: 'ready', patch: payload.patch };
  return payload.patchUnavailable ? { kind: 'unavailable' } : null;
};

export const summaryStateFromPayload = (payload: GitChangesPayload): GitSummaryState =>
  payload.summary ? { kind: 'ready', summary: payload.summary } : { kind: 'unavailable' };

export const summaryStateAfterPayload = (
  current: LoadedGitSummaryState,
  workspacePath: string,
  payload: GitChangesPayload
): LoadedGitSummaryState => {
  if (payload.workspacePath !== workspacePath) return current;

  const nextState = summaryStateFromPayload(payload);
  const sameWorkspace = current.workspacePath === workspacePath;
  const sameState = sameGitSummaryState(current.state, nextState);
  return sameWorkspace && sameState ? current : { state: nextState, workspacePath };
};

export const summaryStateAfterResult = (
  current: LoadedGitSummaryState,
  workspacePath: string,
  nextState: GitSummaryState
): LoadedGitSummaryState => {
  const sameWorkspace = current.workspacePath === workspacePath;
  const sameState = sameGitSummaryState(current.state, nextState);
  return sameWorkspace && sameState ? current : { state: nextState, workspacePath };
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

  const sameEnabled = current.enabled === enabled;
  const sameWorkspace = current.workspacePath === workspacePath;
  const sameState = sameGitPatchState(current.state, nextState);
  return sameEnabled && sameWorkspace && sameState ? current : { enabled, state: nextState, workspacePath };
};

export const patchStateAfterResult = (
  current: LoadedGitPatchState,
  workspacePath: string,
  enabled: boolean,
  nextState: GitPatchState
): LoadedGitPatchState => {
  const sameEnabled = current.enabled === enabled;
  const sameWorkspace = current.workspacePath === workspacePath;
  const sameState = sameGitPatchState(current.state, nextState);
  return sameEnabled && sameWorkspace && sameState ? current : { enabled, state: nextState, workspacePath };
};
