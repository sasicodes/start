import path from 'node:path';
import { readStartState, updateStartState } from '@main/storage';
import type { OpenDialogOptions } from 'electron';
import electron from 'electron';

const { app } = electron;

let activePath: string | undefined;
let stopAccessing: (() => void) | undefined;

const maxWorkspaceBookmarks = 64;

const supportsSecurityScopedBookmarks = () => process.platform === 'darwin' && Boolean(process.mas);

const resolvedPath = (workspacePath: string) => path.resolve(workspacePath);

const containsPath = (parentPath: string, workspacePath: string) => {
  const relativePath = path.relative(parentPath, workspacePath);
  return (
    relativePath === '' || (Boolean(relativePath) && !relativePath.startsWith('..') && !path.isAbsolute(relativePath))
  );
};

const bookmarkForPath = (workspacePath: string) => {
  const bookmarks = readStartState().workspaceBookmarks;
  if (!bookmarks) return;

  return Object.entries(bookmarks)
    .filter(([bookmarkPath]) => containsPath(bookmarkPath, workspacePath))
    .sort(([firstPath], [secondPath]) => secondPath.length - firstPath.length)[0]?.[1];
};

const workspaceBookmarksWith = (workspacePath: string, bookmark: string) => {
  const state = readStartState();
  const entries = Object.entries(state.workspaceBookmarks ?? {}).filter(([key]) => key !== workspacePath);
  entries.push([workspacePath, bookmark]);
  return Object.fromEntries(entries.slice(-maxWorkspaceBookmarks));
};

export const openWorkspaceDialogOptions = (): Pick<OpenDialogOptions, 'properties' | 'securityScopedBookmarks'> => ({
  properties: ['openDirectory'],
  ...(supportsSecurityScopedBookmarks() ? { securityScopedBookmarks: true } : {})
});

export const rememberWorkspaceBookmark = (workspacePath: string, bookmark: string | undefined) => {
  if (!bookmark) return;

  const workspaceKey = resolvedPath(workspacePath);
  updateStartState({ workspaceBookmarks: workspaceBookmarksWith(workspaceKey, bookmark) });
};

export const deactivateWorkspaceAccess = () => {
  stopAccessing?.();
  activePath = undefined;
  stopAccessing = undefined;
};

export const activateWorkspaceAccess = (workspacePath: string) => {
  const nextPath = resolvedPath(workspacePath);
  if (activePath === nextPath && stopAccessing) return;

  if (activePath !== nextPath) {
    stopAccessing?.();
    stopAccessing = undefined;
    activePath = nextPath;
  }

  if (!supportsSecurityScopedBookmarks()) return;

  const bookmark = bookmarkForPath(nextPath);
  if (!bookmark) return;

  try {
    stopAccessing = app.startAccessingSecurityScopedResource(bookmark) as () => void;
  } catch {
    stopAccessing = undefined;
  }
};
