import { diffFold, foldOpenDefault, nextDiffFold, setDiffFold } from '@renderer/shared/workspace/changes/diff/fold';
import { beforeEach, describe, expect, it } from 'vitest';

describe('nextDiffFold', () => {
  it('toggles between collapsed and expanded, starting from collapse', () => {
    expect(nextDiffFold(null)).toBe('collapsed');
    expect(nextDiffFold('collapsed')).toBe('expanded');
    expect(nextDiffFold('expanded')).toBe('collapsed');
  });
});

describe('foldOpenDefault', () => {
  it('uses the per-file default when no bulk fold is set', () => {
    expect(foldOpenDefault(null, true)).toBe(true);
    expect(foldOpenDefault(null, false)).toBe(false);
  });

  it('overrides every file when a bulk fold is set', () => {
    expect(foldOpenDefault('collapsed', true)).toBe(false);
    expect(foldOpenDefault('expanded', false)).toBe(true);
  });
});

describe('setDiffFold', () => {
  beforeEach(() => {
    diffFold.value = null;
  });

  it('writes the shared fold state so late-mounting viewers read it', () => {
    setDiffFold('collapsed');
    expect(diffFold.value).toBe('collapsed');

    setDiffFold(null);
    expect(diffFold.value).toBeNull();
  });
});
