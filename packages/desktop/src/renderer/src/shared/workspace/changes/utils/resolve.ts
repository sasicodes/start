import type { GitChangeSummary, GitChangesPayload, GitPatch, GitPatchSection } from '@preload/index';
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
  const matchesLoadedPatch = patch.enabled === enabled && patch.workspacePath === workspacePath;
  return matchesLoadedPatch ? patch.state : { kind: 'loading' };
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

const sameLoadedGitSummaryState = (
  current: LoadedGitSummaryState,
  workspacePath: string,
  nextState: GitSummaryState
) => {
  const sameWorkspace = current.workspacePath === workspacePath;
  const sameState = sameGitSummaryState(current.state, nextState);
  return sameState && sameWorkspace;
};

const nextLoadedGitSummaryState = (
  current: LoadedGitSummaryState,
  workspacePath: string,
  nextState: GitSummaryState
): LoadedGitSummaryState =>
  sameLoadedGitSummaryState(current, workspacePath, nextState) ? current : { state: nextState, workspacePath };

const sameLoadedGitPatchState = (
  current: LoadedGitPatchState,
  workspacePath: string,
  enabled: boolean,
  nextState: GitPatchState
) => {
  const sameEnabled = current.enabled === enabled;
  const sameState = sameGitPatchState(current.state, nextState);
  const sameWorkspace = current.workspacePath === workspacePath;
  return sameEnabled && sameState && sameWorkspace;
};

const nextLoadedGitPatchState = (
  current: LoadedGitPatchState,
  workspacePath: string,
  enabled: boolean,
  nextState: GitPatchState
): LoadedGitPatchState =>
  sameLoadedGitPatchState(current, workspacePath, enabled, nextState)
    ? current
    : { enabled, state: nextState, workspacePath };

export const summaryStateAfterPayload = (
  current: LoadedGitSummaryState,
  workspacePath: string,
  payload: GitChangesPayload
): LoadedGitSummaryState => {
  if (payload.workspacePath !== workspacePath) return current;

  return nextLoadedGitSummaryState(current, workspacePath, summaryStateFromPayload(payload));
};

export const summaryStateAfterResult = (
  current: LoadedGitSummaryState,
  workspacePath: string,
  nextState: GitSummaryState
): LoadedGitSummaryState => nextLoadedGitSummaryState(current, workspacePath, nextState);

export const patchStateAfterPayload = (
  current: LoadedGitPatchState,
  workspacePath: string,
  enabled: boolean,
  payload: GitChangesPayload
): LoadedGitPatchState => {
  if (payload.workspacePath !== workspacePath) return current;

  const nextState = patchStateFromPayload(payload);
  if (!nextState) return current;

  return nextLoadedGitPatchState(current, workspacePath, enabled, nextState);
};

export const patchStateAfterResult = (
  current: LoadedGitPatchState,
  workspacePath: string,
  enabled: boolean,
  nextState: GitPatchState
): LoadedGitPatchState => nextLoadedGitPatchState(current, workspacePath, enabled, nextState);
