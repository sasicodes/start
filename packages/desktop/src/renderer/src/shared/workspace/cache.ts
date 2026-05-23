import type { WorkspaceInfo } from '@preload/index';
import { workspaceDisplayName } from '@renderer/shared/workspace/utils';

const workspaceCache = new Map<string, WorkspaceInfo>();

const hashString = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
};

const generatedIconDataUrl = (folderName: string) => {
  const hash = hashString(folderName);
  const coldHues = [198, 206, 214, 222, 230, 238];
  const firstHue = coldHues[hash % coldHues.length] ?? 214;
  const secondHue = coldHues[Math.floor(hash / coldHues.length) % coldHues.length] ?? 230;
  const angle = 120 + (hash % 18);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" gradientTransform="rotate(${angle} .5 .5)"><stop stop-color="hsl(${firstHue} 48% 68%)"/><stop offset="1" stop-color="hsl(${secondHue} 46% 46%)"/></linearGradient></defs><circle cx="32" cy="32" r="32" fill="url(#g)"/></svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

export const optimisticWorkspace = (workspacePath: string): WorkspaceInfo => {
  const folderName = workspaceDisplayName(workspacePath);
  return {
    path: workspacePath,
    folderName,
    iconDataUrl: generatedIconDataUrl(folderName)
  };
};

export const cachedWorkspace = (workspacePath: string | undefined) =>
  workspacePath ? (workspaceCache.get(workspacePath) ?? optimisticWorkspace(workspacePath)) : null;

export const forgetWorkspace = (workspacePath: string) => {
  workspaceCache.delete(workspacePath);
};

export const rememberWorkspace = (workspace: WorkspaceInfo) => {
  workspaceCache.set(workspace.path, workspace);
  return workspace;
};
