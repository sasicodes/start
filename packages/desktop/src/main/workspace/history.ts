const maxWorkspaceHistory = 64;

export const workspaceHistoryWith = (
  history: Record<string, number>,
  workspacePath: string,
  openedAt = Date.now()
): Record<string, number> => {
  const entries = Object.entries(history)
    .filter(([path]) => path !== workspacePath)
    .sort(([, firstOpenedAt], [, secondOpenedAt]) => firstOpenedAt - secondOpenedAt);
  entries.push([workspacePath, openedAt]);
  return Object.fromEntries(entries.slice(-maxWorkspaceHistory));
};
