interface SyncOpenedWorkspaceOptions {
  clearSession: () => void;
  onOpenSession: (sessionId: string) => Promise<boolean>;
  syncStatus: () => Promise<void>;
}

export const syncOpenedWorkspace = async (
  sessionId: string,
  { clearSession, onOpenSession, syncStatus }: SyncOpenedWorkspaceOptions
) => {
  try {
    if (sessionId && (await onOpenSession(sessionId))) return;

    clearSession();
    await syncStatus();
  } catch {}
};
