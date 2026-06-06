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

  it('parses untracked summary patches without hunks', () => {
    const file = firstFile(
      ['diff --git "a/new.ts" "b/new.ts"', 'new file mode 100644', '--- /dev/null', '+++ b/new.ts'].join('\n')
    );
    expect(file.displayPath).toBe('new.ts');
    expect(file.status).toBe('added');
    expect(file.newMode).toBe('100644');
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

  it('prefers mode-only over image when an image file only changes permissions', () => {
    const file = firstFile(['diff --git "a/logo.png" "b/logo.png"', 'old mode 100644', 'new mode 100755'].join('\n'));
    expect(patchFileKind(file)).toBe('mode-only');
  });

  it('classifies deleted images as image', () => {
    const file = firstFile(
      [
        'diff --git "a/old.jpg" "b/old.jpg"',
        'deleted file mode 100644',
        'index aaaaaaa..0000000',
        'Binary files a/old.jpg and /dev/null differ'
      ].join('\n')
    );
    expect(patchFileKind(file)).toBe('image');
    expect(file.status).toBe('deleted');
    expect(file.oldMode).toBe('100644');
  });

  it('classifies renamed images as image and exposes both paths', () => {
    const file = firstFile(
      [
        'diff --git "a/old/hero.png" "b/new/hero.png"',
        'similarity index 100%',
        'rename from old/hero.png',
        'rename to new/hero.png'
      ].join('\n')
    );
    expect(patchFileKind(file)).toBe('image');
    expect(file.status).toBe('renamed');
    expect(file.oldPath).toBe('old/hero.png');
    expect(file.newPath).toBe('new/hero.png');
  });

  it('classifies non-image binary files as binary', () => {
    const file = firstFile(
      [
        'diff --git "a/manual.pdf" "b/manual.pdf"',
        'index aaaaaaa..bbbbbbb 100644',
        'Binary files a/manual.pdf and b/manual.pdf differ'
      ].join('\n')
    );
    expect(patchFileKind(file)).toBe('binary');
  });

  it('does not classify SVG edits as image so they keep the text diff', () => {
    const file = firstFile(
      [
        'diff --git "a/icon.svg" "b/icon.svg"',
        'index aaaaaaa..bbbbbbb 100644',
        '--- a/icon.svg',
        '+++ b/icon.svg',
        '@@ -1 +1 @@',
        '-<svg width="10"/>',
        '+<svg width="20"/>'
      ].join('\n')
    );
    expect(patchFileKind(file)).toBe('text');
  });

  it('treats equal old and new modes with no hunks as text rather than mode-only', () => {
    const file = firstFile(['diff --git "a/script.sh" "b/script.sh"', 'index aaaaaaa..bbbbbbb 100755'].join('\n'));
    expect(patchFileKind(file)).toBe('text');
  });
});

describe('isImagePath edge cases', () => {
  it('treats only the final extension', () => {
    expect(isImagePath('archive.tar.gz')).toBe(false);
    expect(isImagePath('photo.backup.png')).toBe(true);
  });

  it('ignores files in directories named like image extensions', () => {
    expect(isImagePath('png/notes.md')).toBe(false);
  });

  it('rejects empty paths', () => {
    expect(isImagePath('')).toBe(false);
  });
});
