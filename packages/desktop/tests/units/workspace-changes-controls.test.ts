import { hasGitDiff } from '@renderer/shared/workspace/changes/controls';
import { describe, expect, it } from 'vitest';

describe('workspace changes state', () => {
  it('hides diff controls when no files changed', () => {
    expect(hasGitDiff({ deletions: 0, insertions: 0, filesChanged: 0 })).toBe(false);
  });

  it('shows diff controls when files changed', () => {
    expect(hasGitDiff({ deletions: 0, insertions: 0, filesChanged: 1 })).toBe(true);
  });
});
