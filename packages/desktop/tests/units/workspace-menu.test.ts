import { canSelectWorkspace } from '@renderer/shared/workspace/select';
import { describe, expect, it } from 'vitest';

describe('workspace menu', () => {
  it('does not select the current workspace', () => {
    expect(canSelectWorkspace('/Users/studio/project', '/Users/studio/project')).toBe(false);
  });

  it('selects a different workspace', () => {
    expect(canSelectWorkspace('/Users/studio/other', '/Users/studio/project')).toBe(true);
  });
});
