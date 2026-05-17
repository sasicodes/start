import type { WorkspaceFolder } from '@preload/index';

let workspaceFoldersCache: WorkspaceFolder[] | undefined;

export const cachedWorkspaceFolders = () => workspaceFoldersCache;

export const loadWorkspaceFolders = async () => {
  const folders = await window.pi.chat.workspaceFolders();
  workspaceFoldersCache = folders;
  return folders;
};
