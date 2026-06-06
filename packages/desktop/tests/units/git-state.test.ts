import { resolvedGitPatchState, resolvedGitSummaryState } from '@renderer/shared/workspace/changes/utils/resolve';
import { describe, expect, it } from 'vitest';

const emptySummary = { deletions: 0, filesChanged: 0, insertions: 0 };

describe('resolvedGitSummaryState', () => {
  it('returns unavailable without a workspace path', () => {
    expect(
      resolvedGitSummaryState({ state: { kind: 'ready', summary: emptySummary }, workspacePath: '/repo' }, '')
    ).toEqual({
      kind: 'unavailable'
    });
  });

  it('returns loading instead of stale data for a different workspace path', () => {
    expect(
      resolvedGitSummaryState({ state: { kind: 'ready', summary: emptySummary }, workspacePath: '/repo' }, '/next')
    ).toEqual({ kind: 'loading' });
  });

  it('returns the cached state for the active workspace path', () => {
    const state = { kind: 'ready' as const, summary: emptySummary };
    expect(resolvedGitSummaryState({ state, workspacePath: '/repo' }, '/repo')).toBe(state);
  });
});

describe('resolvedGitPatchState', () => {
  it('returns idle when patch loading is disabled', () => {
    expect(
      resolvedGitPatchState({ enabled: true, state: { kind: 'loading' }, workspacePath: '/repo' }, '/repo', false)
    ).toEqual({
      kind: 'idle'
    });
  });

  it('returns loading instead of stale data for a different workspace path', () => {
    expect(
      resolvedGitPatchState({ enabled: true, state: { kind: 'unavailable' }, workspacePath: '/repo' }, '/next', true)
    ).toEqual({
      kind: 'loading'
    });
  });

  it('returns the cached state for the active workspace path and enabled state', () => {
    const state = { kind: 'unavailable' as const };
    expect(resolvedGitPatchState({ enabled: true, state, workspacePath: '/repo' }, '/repo', true)).toBe(state);
  });
});
