import { diffFold, nextDiffFold, setDiffFold } from '@renderer/shared/workspace/changes/diff/fold';
import { beforeEach, describe, expect, it } from 'vitest';

describe('nextDiffFold', () => {
  it('toggles between collapsed and expanded, starting from collapse', () => {
    expect(nextDiffFold('collapsed')).toBe('expanded');
    expect(nextDiffFold('expanded')).toBe('collapsed');
  });
});

describe('setDiffFold', () => {
  beforeEach(() => {
    setDiffFold('collapsed');
  });

  it('writes the shared fold state so late-mounting viewers read it', () => {
    setDiffFold('expanded');
    expect(diffFold.value.mode).toBe('expanded');

    setDiffFold('collapsed');
    expect(diffFold.value.mode).toBe('collapsed');
  });
});

describe('bulk fold identity', () => {
  it('invalidates earlier manual overrides when returning to the same mode', () => {
    setDiffFold('collapsed');
    const original = diffFold.value;
    setDiffFold('expanded');
    expect(diffFold.value).not.toBe(original);
    setDiffFold('collapsed');
    expect(diffFold.value.mode).toBe(original.mode);
    expect(diffFold.value).not.toBe(original);
  });

  it('invalidates overrides even when the same bulk action is repeated', () => {
    setDiffFold('collapsed');
    const original = diffFold.value;
    setDiffFold('collapsed');
    expect(diffFold.value).not.toBe(original);
  });
});
