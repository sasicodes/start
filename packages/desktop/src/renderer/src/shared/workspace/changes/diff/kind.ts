import type { PatchFile } from '@renderer/shared/workspace/changes/diff/parser';

export type PatchFileKind = 'binary' | 'image' | 'mode-only' | 'submodule' | 'symlink' | 'text';

const imageExtensions = new Set(['avif', 'bmp', 'gif', 'ico', 'jpeg', 'jpg', 'png', 'webp']);

const submoduleMode = '160000';
const symlinkMode = '120000';

const extensionOf = (filePath: string) => {
  const basename = filePath.split('/').pop() ?? '';
  const dot = basename.lastIndexOf('.');
  return dot === -1 ? '' : basename.slice(dot + 1).toLowerCase();
};

export const isImagePath = (filePath: string) => imageExtensions.has(extensionOf(filePath));

const isMode = (file: PatchFile, mode: string) => file.oldMode === mode || file.newMode === mode;

export const patchFileKind = (file: PatchFile): PatchFileKind => {
  if (isMode(file, submoduleMode)) return 'submodule';
  if (isMode(file, symlinkMode)) return 'symlink';
  if (isImagePath(file.newPath || file.oldPath || file.displayPath)) return 'image';
  if (file.isBinary) return 'binary';
  if (file.hunks.length === 0 && file.oldMode && file.newMode && file.oldMode !== file.newMode) return 'mode-only';
  return 'text';
};
