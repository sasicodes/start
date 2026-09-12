import type { PatchFileKind } from '@renderer/shared/workspace/changes/diff/kind';
import type { PatchFile } from '@renderer/shared/workspace/changes/diff/parser';

const lineHeight = 24;
const hunkGapHeight = 36;
const fileHeaderHeight = 52;
const imageBodyHeight = 360;
const sectionPaddingTop = 8;
const tooLargeChangeThreshold = 2000;

export const fileHasTextDiff = (file: PatchFile) => file.hunks.length > 0;

export const isTooLargeToShow = (file: PatchFile) => file.added + file.removed > tooLargeChangeThreshold;

const textBodyHeight = (file: PatchFile) => {
  let totalLines = 0;
  for (const hunk of file.hunks) totalLines += hunk.lines.length;
  const gaps = Math.max(0, file.hunks.length - 1) * hunkGapHeight;
  return sectionPaddingTop + totalLines * lineHeight + gaps;
};

export const estimatedFileHeight = (file: PatchFile, kind: PatchFileKind, open = false) => {
  if (!open || (!fileHasTextDiff(file) && kind !== 'image')) return fileHeaderHeight;
  if (kind === 'image') return fileHeaderHeight + imageBodyHeight;
  return fileHeaderHeight + textBodyHeight(file);
};
