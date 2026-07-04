import type { WorkspaceFolder } from '@preload/index';
import { workspaceDisplayName } from '@renderer/shared/workspace/utils';
import { useCallback, useEffect, useState } from 'preact/hooks';

type WorkspaceFoldersListener = () => void;

interface UseWorkspaceFoldersOptions {
  active?: boolean;
  workspacePath: string | undefined;
}

let stopWorkspaceFolderEvents: (() => void) | undefined;
let workspaceFoldersCache: WorkspaceFolder[] | undefined;
let workspaceFoldersRequest: Promise<WorkspaceFolder[]> | undefined;
let workspaceFoldersRequestPrune = false;
let pruneWorkspaceFolders = false;
let workspaceFoldersSeq = 0;
let appliedWorkspaceFoldersSeq = 0;

const workspaceFoldersListeners = new Set<WorkspaceFoldersListener>();

const currentWorkspaceFolder = (workspacePath: string): WorkspaceFolder => ({
  sessionCount: 0,
  path: workspacePath,
  modified: Date.now(),
  name: workspaceDisplayName(workspacePath)
});

const withCurrentWorkspace = (folders: WorkspaceFolder[], workspacePath: string | undefined) => {
  if (!workspacePath || folders.some((folder) => folder.path === workspacePath)) return folders;
  return [currentWorkspaceFolder(workspacePath), ...folders];
};

const emitWorkspaceFolders = () => {
  for (const listener of workspaceFoldersListeners) listener();
};

export const cachedWorkspaceFolders = (workspacePath?: string) =>
  withCurrentWorkspace(workspaceFoldersCache ?? [], workspacePath);

export const setWorkspaceFoldersPrune = (prune: boolean) => {
  pruneWorkspaceFolders = prune;
};

const applyWorkspaceFolders = (folders: WorkspaceFolder[], seq: number) => {
  if (seq < appliedWorkspaceFoldersSeq) return workspaceFoldersCache ?? folders;
  appliedWorkspaceFoldersSeq = seq;
  workspaceFoldersCache = folders;
  emitWorkspaceFolders();
  return folders;
};

export const loadWorkspaceFolders = async () => {
  if (workspaceFoldersRequest && workspaceFoldersRequestPrune === pruneWorkspaceFolders) {
    return workspaceFoldersRequest;
  }

  workspaceFoldersSeq += 1;
  const seq = workspaceFoldersSeq;
  workspaceFoldersRequestPrune = pruneWorkspaceFolders;
  const request = window.pi.chat
    .workspaceFolders(pruneWorkspaceFolders)
    .then((folders) => applyWorkspaceFolders(folders, seq))
    .finally(() => {
      if (workspaceFoldersRequest === request) workspaceFoldersRequest = undefined;
    });
  workspaceFoldersRequest = request;

  return request;
};

export const primeWorkspaceFolders = (workspacePath: string | undefined) => {
  const nextFolders = cachedWorkspaceFolders(workspacePath);
  if (nextFolders !== workspaceFoldersCache) {
    workspaceFoldersCache = nextFolders;
    emitWorkspaceFolders();
  }

  loadWorkspaceFolders().catch(emitWorkspaceFolders);
};

const refreshWorkspaceFolders = () => {
  loadWorkspaceFolders().catch(emitWorkspaceFolders);
};

const watchWorkspaceFolders = () => {
  if (stopWorkspaceFolderEvents) return;
  const offRecentSessionsChanged = window.pi.chat.onRecentSessionsChanged(refreshWorkspaceFolders);
  const offStatusChanged = window.pi.chat.onStatusChanged(refreshWorkspaceFolders);
  stopWorkspaceFolderEvents = () => {
    offRecentSessionsChanged();
    offStatusChanged();
  };
};

const unwatchWorkspaceFolders = () => {
  if (workspaceFoldersListeners.size > 0) return;
  stopWorkspaceFolderEvents?.();
  stopWorkspaceFolderEvents = undefined;
};

const subscribeWorkspaceFolders = (listener: WorkspaceFoldersListener) => {
  workspaceFoldersListeners.add(listener);
  watchWorkspaceFolders();

  return () => {
    workspaceFoldersListeners.delete(listener);
    unwatchWorkspaceFolders();
  };
};

export const useWorkspaceFolders = ({ active = true, workspacePath }: UseWorkspaceFoldersOptions) => {
  const [folders, setFolders] = useState(() => cachedWorkspaceFolders(workspacePath));

  const syncFolders = useCallback(() => {
    setFolders(cachedWorkspaceFolders(workspacePath));
  }, [workspacePath]);

  const refreshFolders = useCallback(() => {
    primeWorkspaceFolders(workspacePath);
  }, [workspacePath]);

  useEffect(() => {
    if (!active) return;
    return subscribeWorkspaceFolders(syncFolders);
  }, [active, syncFolders]);
  useEffect(() => {
    if (active) refreshFolders();
  }, [active, refreshFolders]);

  return {
    refreshFolders,
    folders: withCurrentWorkspace(folders, workspacePath)
  };
};
