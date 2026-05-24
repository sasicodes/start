import type { PatchFileKind } from '@renderer/shared/workspace/changes/diff/kind';
import type { PatchFile } from '@renderer/shared/workspace/changes/diff/parser';

const lineHeight = 24;
const hunkGapHeight = 36;
const fileHeaderHeight = 52;
const imageBodyHeight = 360;
const sectionPaddingTop = 8;
const fallbackBodyHeight = 56;
const tooLargeChangeThreshold = 2000;

export const fileHasTextDiff = (file: PatchFile) => file.hunks.length > 0;

export const isTooLargeToShow = (file: PatchFile) => file.added + file.removed > tooLargeChangeThreshold;

export const isOpenByDefault = (file: PatchFile, kind: PatchFileKind) =>
  kind === 'image' || (fileHasTextDiff(file) && !isTooLargeToShow(file) && file.added + file.removed <= 320);

const textBodyHeight = (file: PatchFile) => {
  let totalLines = 0;
  for (const hunk of file.hunks) totalLines += hunk.lines.length;
  const gaps = Math.max(0, file.hunks.length - 1) * hunkGapHeight;
  return sectionPaddingTop + totalLines * lineHeight + gaps;
};

export const estimatedFileHeight = (file: PatchFile, kind: PatchFileKind) => {
  if (!isOpenByDefault(file, kind)) return fileHeaderHeight;
  if (kind === 'image') return fileHeaderHeight + imageBodyHeight;
  if (isTooLargeToShow(file)) return fileHeaderHeight + fallbackBodyHeight;
  return fileHeaderHeight + textBodyHeight(file);
};
