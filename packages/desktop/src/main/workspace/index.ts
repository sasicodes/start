import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { workspaceDisplayName } from '@main/utils/workspace';
import { type GitChangeSummary, getGitBranch, getGitChangeSummary, isGitRepository } from '@main/git';
import { startCacheDir } from '@main/storage';
import { generatedWorkspaceIconDataUrl, workspaceIconDataUrl } from '@main/workspace/icons';

export type WorkspaceInfo = {
  branchName?: string;
  folderName: string;
  git?: GitChangeSummary;
  iconDataUrl: string;
  path: string;
};

type CachedWorkspaceInfo = WorkspaceInfo & {
  updatedAt: number;
};

type WorkspaceCacheFile = {
  version: 1;
  workspaces: Record<string, CachedWorkspaceInfo>;
};

type WorkspaceChangeListener = (workspace: WorkspaceInfo) => void;

const maxWorkspaceCacheSize = 64;
const workspaceCachePath = () => path.join(startCacheDir(), 'workspaces.json');
const workspaceCache = new Map<string, CachedWorkspaceInfo>();
const workspaceRequests = new Map<string, Promise<WorkspaceInfo>>();
const workspaceChangeListeners = new Set<WorkspaceChangeListener>();

let workspaceCacheLoaded = false;
let workspaceCacheWrite = Promise.resolve();

const cleanString = (value: unknown) => {
  if (typeof value === 'string' && value.trim()) return value.trim();
  return;
};

const cleanCachedWorkspace = (value: unknown): CachedWorkspaceInfo | undefined => {
  if (!value || typeof value !== 'object') return;

  const workspace = value as Partial<CachedWorkspaceInfo>;
  const folderName = cleanString(workspace.folderName);
  const iconDataUrl = cleanString(workspace.iconDataUrl);
  const workspacePath = cleanString(workspace.path);
  const branchName = cleanString(workspace.branchName);
  if (!folderName || !iconDataUrl || !workspacePath) return;

  return {
    folderName,
    iconDataUrl,
    path: workspacePath,
    updatedAt: typeof workspace.updatedAt === 'number' ? workspace.updatedAt : 0,
    ...(branchName ? { branchName } : {})
  };
};

const workspaceInfo = (
  cwd: string,
  folderName: string,
  iconDataUrl: string,
  branchName?: string,
  git?: GitChangeSummary
): WorkspaceInfo => ({
  ...(branchName ? { branchName } : {}),
  ...(git ? { git } : {}),
  folderName,
  iconDataUrl,
  path: cwd
});

const cachedWorkspaceInfo = (workspace: WorkspaceInfo): CachedWorkspaceInfo => ({
  ...workspace,
  updatedAt: Date.now()
});

const visibleWorkspaceInfo = ({ updatedAt: _updatedAt, ...workspace }: CachedWorkspaceInfo): WorkspaceInfo => workspace;

const sameGitChangeSummary = (first: GitChangeSummary | undefined, second: GitChangeSummary | undefined) => {
  if (!first || !second) return first === second;
  return (
    first.filesChanged === second.filesChanged &&
    first.insertions === second.insertions &&
    first.deletions === second.deletions
  );
};

const sameWorkspaceInfo = (first: WorkspaceInfo | undefined, second: WorkspaceInfo) => {
  if (!first) return false;
  return (
    first.folderName === second.folderName &&
    first.iconDataUrl === second.iconDataUrl &&
    first.path === second.path &&
    first.branchName === second.branchName &&
    sameGitChangeSummary(first.git, second.git)
  );
};

const workspaceExists = async (cwd: string) => {
  const details = await stat(cwd).catch(() => {});
  return Boolean(details?.isDirectory());
};

const trimWorkspaceCache = () => {
  while (workspaceCache.size > maxWorkspaceCacheSize) {
    const oldestKey = workspaceCache.keys().next().value;
    if (!oldestKey) return;
    workspaceCache.delete(oldestKey);
  }
};

const emitWorkspaceChanged = (workspace: WorkspaceInfo) => {
  for (const listener of workspaceChangeListeners) listener(workspace);
};

const saveWorkspaceCache = () => {
  const payload: WorkspaceCacheFile = {
    version: 1,
    workspaces: Object.fromEntries(workspaceCache)
  };

  workspaceCacheWrite = workspaceCacheWrite
    .then(async () => {
      await mkdir(startCacheDir(), { recursive: true });
      await writeFile(workspaceCachePath(), `${JSON.stringify(payload)}\n`, 'utf8');
    })
    .catch(() => {});
};

const loadWorkspaceCache = async () => {
  if (workspaceCacheLoaded) return;
  workspaceCacheLoaded = true;

  const source = await readFile(workspaceCachePath(), 'utf8').catch(() => '');
  if (!source) return;

  try {
    const parsed = JSON.parse(source) as Partial<WorkspaceCacheFile>;
    const entries = Object.entries(parsed.workspaces ?? {}).flatMap(([key, value]) => {
      const workspace = cleanCachedWorkspace(value);
      return workspace ? ([[path.resolve(key), workspace]] as const) : [];
    });

    for (const [key, workspace] of entries.slice(-maxWorkspaceCacheSize)) workspaceCache.set(key, workspace);
  } catch {}
};

const storeWorkspace = (workspace: WorkspaceInfo) => {
  const key = path.resolve(workspace.path);
  if (workspaceCache.has(key)) workspaceCache.delete(key);
  workspaceCache.set(key, cachedWorkspaceInfo(workspace));
  trimWorkspaceCache();
  saveWorkspaceCache();
};

const readWorkspace = async (cwd: string): Promise<WorkspaceInfo> => {
  const folderName = workspaceDisplayName(cwd);
  if (!(await workspaceExists(cwd))) {
    return workspaceInfo(cwd, folderName, generatedWorkspaceIconDataUrl(folderName));
  }

  const isGitWorkspace = await isGitRepository(cwd);
  const iconDataUrlPromise = isGitWorkspace
    ? workspaceIconDataUrl(cwd, folderName)
    : Promise.resolve(generatedWorkspaceIconDataUrl(folderName));
  let branchName: string | undefined;
  let git: GitChangeSummary | undefined;

  if (isGitWorkspace) {
    [branchName, git] = await Promise.all([getGitBranch(cwd), getGitChangeSummary(cwd)]);
  }

  const iconDataUrl = await iconDataUrlPromise;
  let gitSummary: GitChangeSummary | undefined;
  if (isGitWorkspace) gitSummary = git ?? { filesChanged: 0, insertions: 0, deletions: 0 };
  return workspaceInfo(cwd, folderName, iconDataUrl, branchName, gitSummary);
};

const refreshWorkspace = (cwd: string, notifyChanged: boolean) => {
  const key = path.resolve(cwd);
  const existingRequest = workspaceRequests.get(key);
  if (existingRequest) return existingRequest;

  const request = readWorkspace(key)
    .then((workspace) => {
      const previous = workspaceCache.get(key);
      storeWorkspace(workspace);
      if (notifyChanged && !sameWorkspaceInfo(previous, workspace)) emitWorkspaceChanged(workspace);
      return workspace;
    })
    .finally(() => {
      workspaceRequests.delete(key);
    });

  workspaceRequests.set(key, request);
  return request;
};

export const onWorkspaceChanged = (listener: WorkspaceChangeListener) => {
  workspaceChangeListeners.add(listener);
  return () => workspaceChangeListeners.delete(listener);
};

export const getCachedWorkspace = async (cwd = process.cwd()) => {
  const key = path.resolve(cwd);
  await loadWorkspaceCache();

  const cached = workspaceCache.get(key);
  if (cached && (await workspaceExists(key))) return visibleWorkspaceInfo(cached);
  return;
};

export const getWorkspace = async (cwd = process.cwd()) => {
  const key = path.resolve(cwd);
  await loadWorkspaceCache();

  const cached = workspaceCache.get(key);
  if (cached && (await workspaceExists(key))) {
    void refreshWorkspace(key, true);
    return visibleWorkspaceInfo(cached);
  }

  if (cached) {
    workspaceCache.delete(key);
    saveWorkspaceCache();
  }

  return refreshWorkspace(key, false);
};
