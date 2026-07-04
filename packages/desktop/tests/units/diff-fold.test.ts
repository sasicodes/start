import { diffFoldCommand, requestDiffFold } from '@renderer/shared/workspace/changes/diff/fold';
import { beforeEach, describe, expect, it } from 'vitest';

describe('requestDiffFold', () => {
  beforeEach(() => {
    diffFoldCommand.value = null;
  });

  it('emits the requested action with an incrementing nonce', () => {
    requestDiffFold('collapse');
    expect(diffFoldCommand.value).toEqual({ action: 'collapse', nonce: 1 });

    requestDiffFold('expand');
    expect(diffFoldCommand.value).toEqual({ action: 'expand', nonce: 2 });
  });

  it('changes identity on every request so repeated actions still notify', () => {
    requestDiffFold('collapse');
    const first = diffFoldCommand.value;
    requestDiffFold('collapse');
    expect(diffFoldCommand.value).not.toBe(first);
    expect(diffFoldCommand.value?.nonce).toBe(2);
  });
});
