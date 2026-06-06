import type { GitChangeSummary, GitPatch, GitPatchSectionKind } from '@preload/index';

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
