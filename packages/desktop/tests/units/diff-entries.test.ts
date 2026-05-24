import type { GitPatchSection } from '@preload/index';
import { entriesFromResults } from '@renderer/shared/workspace/changes/diff/entries';
import type { PatchFile } from '@renderer/shared/workspace/changes/diff/parser';
import { describe, expect, it } from 'vitest';

const section = (kind: GitPatchSection['kind']): GitPatchSection => ({
  kind,
  patch: '',
  limited: false,
  deletions: 0,
  insertions: 0,
  filesChanged: 0
});

const file = (overrides: Partial<PatchFile> = {}): PatchFile => ({
  added: 0,
  displayPath: 'a.ts',
  hunks: [],
  isBinary: false,
  newMode: '',
  newPath: 'a.ts',
  oldMode: '',
  oldPath: 'a.ts',
  removed: 0,
  status: 'modified',
  ...overrides
});

describe('entriesFromResults', () => {
  it('returns an empty list when there are no sections', () => {
    expect(entriesFromResults([], [])).toEqual([]);
  });

  it('preserves the file status for staged and unstaged sections', () => {
    const result = entriesFromResults(
      [section('staged'), section('unstaged')],
      [[file({ status: 'added' })], [file({ status: 'deleted' })]]
    );
    expect(result.map((entry) => entry.status)).toEqual(['added', 'deleted']);
  });

  it('overrides the status to untracked for untracked sections', () => {
    const result = entriesFromResults([section('untracked')], [[file({ status: 'added' })]]);
    expect(result[0]?.status).toBe('untracked');
  });

  it('builds a stable key from section kind, paths, and file index', () => {
    const result = entriesFromResults(
      [section('staged')],
      [[file({ newPath: 'b.ts', oldPath: 'a.ts' }), file({ newPath: 'd.ts', oldPath: 'c.ts' })]]
    );
    expect(result.map((entry) => entry.key)).toEqual(['staged:a.ts:b.ts:0', 'staged:c.ts:d.ts:1']);
  });

  it('detects language from the file path', () => {
    const result = entriesFromResults([section('staged')], [[file({ newPath: 'a.ts' })]]);
    expect(result[0]?.language).toBe('typescript');
  });

  it('tolerates missing results for a section', () => {
    const result = entriesFromResults([section('staged'), section('unstaged')], [[file()]]);
    expect(result).toHaveLength(1);
  });
});
