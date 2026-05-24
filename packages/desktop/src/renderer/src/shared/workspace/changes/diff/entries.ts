import type { GitPatchSection } from '@preload/index';
import { patchFileLanguage } from '@renderer/shared/workspace/changes/diff/language';
import type { PatchFile } from '@renderer/shared/workspace/changes/diff/parser';
import type { DiffEntry } from '@renderer/shared/workspace/changes/diff/types';

const patchFileKey = (file: PatchFile, sectionKind: GitPatchSection['kind'], index: number) =>
  `${sectionKind}:${file.oldPath}:${file.newPath}:${index}`;

export const entriesFromResults = (sections: GitPatchSection[], results: PatchFile[][]): DiffEntry[] => {
  const entries: DiffEntry[] = [];
  for (const [sectionIndex, section] of sections.entries()) {
    const files = results[sectionIndex] ?? [];
    for (const [fileIndex, file] of files.entries()) {
      entries.push({
        file,
        key: patchFileKey(file, section.kind, fileIndex),
        language: patchFileLanguage(file),
        status: section.kind === 'untracked' ? 'untracked' : file.status
      });
    }
  }
  return entries;
};
