import { estimatedFileHeight, isTooLargeToShow } from '@renderer/shared/workspace/changes/diff/estimate';
import type { PatchFile } from '@renderer/shared/workspace/changes/diff/parser';
import { describe, expect, it } from 'vitest';

const buildFile = (overrides: Partial<PatchFile> = {}): PatchFile => ({
  added: 0,
  displayPath: 'file.ts',
  hunks: [],
  isBinary: false,
  newMode: '',
  newPath: 'file.ts',
  oldMode: '',
  oldPath: 'file.ts',
  removed: 0,
  status: 'modified',
  ...overrides
});

const hunkOf = (lineCount: number) => ({
  header: '@@ -1,1 +1,1 @@',
  lines: Array.from({ length: lineCount }, () => ({ content: 'line', kind: 'context' as const }))
});

describe('estimatedFileHeight', () => {
  it('starts image and text rows collapsed regardless of diff size', () => {
    expect(estimatedFileHeight(buildFile(), 'image')).toBe(52);
    expect(estimatedFileHeight(buildFile({ added: 1, hunks: [hunkOf(10)] }), 'text')).toBe(52);
    expect(estimatedFileHeight(buildFile({ added: 5000, hunks: [hunkOf(5000)] }), 'text')).toBe(52);
  });

  it('returns just the header height for closed rows', () => {
    expect(estimatedFileHeight(buildFile(), 'binary')).toBe(52);
  });

  it('returns header plus image body for image rows', () => {
    expect(estimatedFileHeight(buildFile(), 'image', true)).toBeGreaterThan(52);
  });

  it('grows with the number of text lines', () => {
    const small = estimatedFileHeight(buildFile({ added: 1, hunks: [hunkOf(10)], removed: 1 }), 'text', true);
    const large = estimatedFileHeight(buildFile({ added: 1, hunks: [hunkOf(100)], removed: 1 }), 'text', true);
    expect(large).toBeGreaterThan(small);
  });

  it('returns just the header when kind is text but there are no hunks', () => {
    expect(estimatedFileHeight(buildFile(), 'text')).toBe(52);
  });
});

describe('isTooLargeToShow', () => {
  it('is false for small changes', () => {
    expect(isTooLargeToShow(buildFile({ added: 100, removed: 100 }))).toBe(false);
  });

  it('is false right at the threshold', () => {
    expect(isTooLargeToShow(buildFile({ added: 1000, removed: 1000 }))).toBe(false);
  });

  it('is true above the threshold', () => {
    expect(isTooLargeToShow(buildFile({ added: 1500, removed: 1500 }))).toBe(true);
  });
});
