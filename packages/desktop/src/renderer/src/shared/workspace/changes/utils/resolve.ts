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
