import { extensionOf } from '@renderer/shared/workspace/changes/diff/extension';
import type { PatchFile } from '@renderer/shared/workspace/changes/diff/parser';

export type PatchFileKind = 'text' | 'image' | 'binary' | 'symlink' | 'mode-only' | 'submodule';

const imageExtensions = new Set(['bmp', 'gif', 'ico', 'jpg', 'png', 'avif', 'jpeg', 'webp']);

export const isImagePath = (filePath: string) => imageExtensions.has(extensionOf(filePath));

const isMode = (file: PatchFile, mode: string) => file.oldMode === mode || file.newMode === mode;

export const patchFileKind = (file: PatchFile): PatchFileKind => {
  if (isMode(file, '160000')) return 'submodule';
  if (isMode(file, '120000')) return 'symlink';
  if (file.hunks.length === 0 && file.oldMode && file.newMode && file.oldMode !== file.newMode) return 'mode-only';
  if (isImagePath(file.newPath || file.oldPath || file.displayPath)) return 'image';
  if (file.isBinary) return 'binary';
  return 'text';
};
