import type { WorkspaceFolder } from '@preload/index';
import { useCallback, useEffect, useState } from 'preact/hooks';

type WorkspaceFoldersListener = () => void;

let stopWorkspaceFolderEvents: (() => void) | undefined;
let workspaceFoldersCache: WorkspaceFolder[] | undefined;
let workspaceFoldersRequest: Promise<WorkspaceFolder[]> | undefined;
let workspaceFoldersSeq = 0;
let appliedWorkspaceFoldersSeq = 0;

const workspaceFoldersListeners = new Set<WorkspaceFoldersListener>();

const emitWorkspaceFolders = () => {
  for (const listener of workspaceFoldersListeners) listener();
};

export const cachedWorkspaceFolders = () => workspaceFoldersCache ?? [];

const applyWorkspaceFolders = (folders: WorkspaceFolder[], seq: number) => {
  if (seq < appliedWorkspaceFoldersSeq) return workspaceFoldersCache ?? folders;
  appliedWorkspaceFoldersSeq = seq;
  workspaceFoldersCache = folders;
  emitWorkspaceFolders();
  return folders;
};

export const loadWorkspaceFolders = async () => {
  if (workspaceFoldersRequest) return workspaceFoldersRequest;

  workspaceFoldersSeq += 1;
  const seq = workspaceFoldersSeq;
  const request = window.pi.chat
    .workspaceFolders()
    .then((folders) => applyWorkspaceFolders(folders, seq))
    .finally(() => {
      if (workspaceFoldersRequest === request) workspaceFoldersRequest = undefined;
    });
  workspaceFoldersRequest = request;

  return request;
};

export const primeWorkspaceFolders = () => {
  loadWorkspaceFolders().catch(emitWorkspaceFolders);
};

const watchWorkspaceFolders = () => {
  if (stopWorkspaceFolderEvents) return;
  const offRecentSessionsChanged = window.pi.chat.onRecentSessionsChanged(primeWorkspaceFolders);
  const offStatusChanged = window.pi.chat.onStatusChanged(primeWorkspaceFolders);
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

export const useWorkspaceFolders = () => {
  const [folders, setFolders] = useState(cachedWorkspaceFolders);

  const syncFolders = useCallback(() => {
    setFolders(cachedWorkspaceFolders());
  }, []);

  useEffect(() => subscribeWorkspaceFolders(syncFolders), [syncFolders]);
  useEffect(() => {
    primeWorkspaceFolders();
  }, []);

  return {
    folders,
    refreshFolders: primeWorkspaceFolders
  };
};
