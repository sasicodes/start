import { isImagePath, patchFileKind } from '@renderer/shared/workspace/changes/diff/kind';
import { parseGitPatch } from '@renderer/shared/workspace/changes/diff/parser';
import { describe, expect, it } from 'vitest';

const firstFile = (patch: string) => {
  const [file] = parseGitPatch(patch);
  if (!file) throw new Error('parser produced no file');
  return file;
};

describe('isImagePath', () => {
  it('matches common raster extensions case-insensitively', () => {
    expect(isImagePath('icons/star.png')).toBe(true);
    expect(isImagePath('photos/A.JPG')).toBe(true);
    expect(isImagePath('hero.webp')).toBe(true);
    expect(isImagePath('cursor.ico')).toBe(true);
  });

  it('rejects SVG and non-image extensions', () => {
    expect(isImagePath('logo.svg')).toBe(false);
    expect(isImagePath('script.ts')).toBe(false);
    expect(isImagePath('no-extension')).toBe(false);
  });
});

describe('patchFileKind', () => {
  it('classifies binary image diffs as image', () => {
    const file = firstFile(
      [
        'diff --git "a/icon.png" "b/icon.png"',
        'index aaaaaaa..bbbbbbb 100644',
        'Binary files a/icon.png and b/icon.png differ'
      ].join('\n')
    );
    expect(patchFileKind(file)).toBe('image');
  });

  it('classifies submodule pointer changes via gitlink mode', () => {
    const file = firstFile(
      [
        'diff --git "a/sub" "b/sub"',
        'index aaaaaaa..bbbbbbb 160000',
        '--- a/sub',
        '+++ b/sub',
        '@@ -1 +1 @@',
        '-Subproject commit aaaaaaa',
        '+Subproject commit bbbbbbb'
      ].join('\n')
    );
    expect(patchFileKind(file)).toBe('submodule');
  });

  it('classifies symlink changes via mode 120000', () => {
    const file = firstFile(
      [
        'diff --git "a/link" "b/link"',
        'index aaaaaaa..bbbbbbb 120000',
        '--- a/link',
        '+++ b/link',
        '@@ -1 +1 @@',
        '-old/target',
        '+new/target'
      ].join('\n')
    );
    expect(patchFileKind(file)).toBe('symlink');
  });

  it('classifies mode-only changes when no hunks are present', () => {
    const file = firstFile(['diff --git "a/script" "b/script"', 'old mode 100644', 'new mode 100755'].join('\n'));
    expect(patchFileKind(file)).toBe('mode-only');
    expect(file.oldMode).toBe('100644');
    expect(file.newMode).toBe('100755');
  });

  it('falls back to text for ordinary source diffs', () => {
    const file = firstFile(
      [
        'diff --git "a/app.ts" "b/app.ts"',
        'index aaaaaaa..bbbbbbb 100644',
        '--- a/app.ts',
        '+++ b/app.ts',
        '@@ -1 +1,2 @@',
        ' line one',
        '+line two'
      ].join('\n')
    );
    expect(patchFileKind(file)).toBe('text');
  });

  it('marks added images as image regardless of git binary marker absence', () => {
    const file = firstFile(
      [
        'diff --git "a/added.gif" "b/added.gif"',
        'new file mode 100644',
        'index 0000000..aaaaaaa',
        'Binary files /dev/null and b/added.gif differ'
      ].join('\n')
    );
    expect(patchFileKind(file)).toBe('image');
    expect(file.status).toBe('added');
    expect(file.newMode).toBe('100644');
  });
});
