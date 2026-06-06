import { highlightableDiffLines } from '@renderer/shared/workspace/changes/diff/highlight';
import type { PatchFile } from '@renderer/shared/workspace/changes/diff/parser';
import { describe, expect, it } from 'vitest';

const patchFile = (content: string[]): PatchFile => ({
  added: content.length,
  displayPath: 'src/app.ts',
  hunks: [
    {
      header: '@@ -1,1 +1,1 @@',
      lines: content.map((line, index) => ({
        content: line,
        kind: index === 1 ? 'meta' : 'add',
        newLine: index + 1
      }))
    }
  ],
  isBinary: false,
  newMode: '',
  newPath: 'src/app.ts',
  oldMode: '',
  oldPath: 'src/app.ts',
  removed: 0,
  status: 'modified'
});

describe('highlightableDiffLines', () => {
  it('collects unique non-meta lines when a language is available', () => {
    const lines = highlightableDiffLines(
      patchFile(['const value = 1;', '@@ header', 'const value = 1;', '']),
      'ts',
      () => false
    );

    expect(lines.map((line) => line.content)).toEqual(['const value = 1;']);
  });

  it('skips lines that are too long or already cached', () => {
    const file = patchFile(['const first = 1;', 'meta', 'const second = 2;', 'x'.repeat(601)]);
    const lines = highlightableDiffLines(file, 'ts', (key) => key.includes('const first'));

    expect(lines.map((line) => line.content)).toEqual(['const second = 2;']);
  });

  it('returns no work without a language', () => {
    expect(highlightableDiffLines(patchFile(['const value = 1;']), '', () => false)).toEqual([]);
  });
});
