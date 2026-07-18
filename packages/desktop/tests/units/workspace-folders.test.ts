import { cachedWorkspaceFolders } from '@renderer/shared/workspace/folders';
import { describe, expect, it } from 'vitest';

describe('workspace folder cache', () => {
  it('stays empty until canonical folders arrive from the main process', () => {
    expect(cachedWorkspaceFolders()).toEqual([]);
  });
});
