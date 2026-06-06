import { workspaceHistoryWith } from '@main/workspace/history';
import { describe, expect, it } from 'vitest';

describe('workspace history', () => {
  it('adds a workspace without removing previous entries', () => {
    expect(workspaceHistoryWith({ '/Users/me': 1 }, '/code/app', 2)).toEqual({
      '/Users/me': 1,
      '/code/app': 2
    });
  });

  it('refreshes an existing workspace timestamp without duplicating it', () => {
    expect(workspaceHistoryWith({ '/Users/me': 1, '/code/app': 2 }, '/Users/me', 3)).toEqual({
      '/code/app': 2,
      '/Users/me': 3
    });
  });

  it('keeps the most recent workspace entries', () => {
    const history = Object.fromEntries(
      Array.from({ length: 64 }, (_, index) => [`/workspace/${index}`, index] as const)
    );

    const nextHistory = workspaceHistoryWith(history, '/workspace/new', 64);

    expect(Object.keys(nextHistory)).toHaveLength(64);
    expect(nextHistory).not.toHaveProperty('/workspace/0');
    expect(nextHistory['/workspace/new']).toBe(64);
  });
});
