const activatedPaths: string[] = [];

export const activateWorkspaceAccess = (workspacePath: string) => {
  activatedPaths.push(workspacePath);
};

export const deactivateWorkspaceAccess = () => {};

export const rememberWorkspaceBookmark = (_workspacePath: string, _bookmark: string | undefined) => {};

export const openWorkspaceDialogOptions = () => ({ properties: ['openDirectory'] as const });

export const activationLog = () => [...activatedPaths];

export const resetWorkspaceAccess = () => {
  activatedPaths.length = 0;
};
