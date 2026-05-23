import type { ChatService } from '@main/chat';
import { openWorkspaceDialogOptions, rememberWorkspaceBookmark } from '@main/workspace/access';
import type { withComposerBlurSuppressed } from '@main/window';
import { BrowserWindow, dialog, ipcMain, type WebContents } from 'electron';

interface ChatIpcOptions {
  chat: ChatService;
  startNewSession: () => Promise<void>;
  notifyStatusChanged: () => void;
  withComposerBlurSuppressed: typeof withComposerBlurSuppressed;
  watchRecentSessions: (workspacePath?: string) => void;
  notifyRecentSessionsChanged: (workspacePath?: string) => void;
  withCachedWorkspace: <T extends { status?: { workspacePath: string } }>(result: T) => Promise<T>;
}

export const registerChatIpc = ({
  chat,
  startNewSession,
  notifyStatusChanged,
  watchRecentSessions,
  withCachedWorkspace,
  withComposerBlurSuppressed,
  notifyRecentSessionsChanged
}: ChatIpcOptions) => {
  ipcMain.handle('chat:tabs', () => chat.getTabs());
  ipcMain.handle('chat:abort', (event) => chat.abort(event.sender as WebContents));
  ipcMain.handle('chat:models', () => chat.getModels());
  ipcMain.handle('chat:send', async (event, prompt: string, attachments = []) => {
    const result = await chat.send(prompt, event.sender as WebContents, attachments);
    if (result.ok) notifyRecentSessionsChanged();
    return result;
  });
  ipcMain.handle('chat:status', () => chat.getStatus());
  ipcMain.handle('chat:command', async (event, command: string, excludeFromContext: boolean) => {
    const result = await chat.command(command, excludeFromContext, event.sender as WebContents);
    if (result.ok) notifyRecentSessionsChanged();
    return result;
  });
  ipcMain.handle('chat:tabs:list', () => chat.getTabs());
  ipcMain.handle('chat:new-session', () => startNewSession());
  ipcMain.handle('chat:tabs:abort', (_event, id: string) => chat.abortTab(id));
  ipcMain.handle('chat:tabs:close', (_event, id: string) => chat.closeTab(id));
  ipcMain.handle('chat:tabs:create', (_event, workspacePath?: string) => chat.createTab(workspacePath));
  ipcMain.handle('chat:tabs:status', () => chat.getStatus());
  ipcMain.handle('chat:notices:list', () => chat.getNotices());
  ipcMain.handle('chat:auth-providers', () => chat.getAuthProviders());
  ipcMain.handle('chat:open-session', async (_event, path: string) => {
    const result = await chat.openSession(path);
    if (result.ok) {
      watchRecentSessions();
      notifyStatusChanged();
      notifyRecentSessionsChanged();
    }
    return result;
  });
  ipcMain.handle('chat:select-model', async (_event, modelKey: string) => {
    const status = await chat.selectModel(modelKey);
    notifyStatusChanged();
    return status;
  });
  ipcMain.handle('chat:sessions:page', (_event, options = {}) => chat.getRecentSessionsPage(options));
  ipcMain.handle('chat:tabs:activate', (_event, id: string) => chat.activateTab(id));
  ipcMain.handle('chat:tabs:send', (event, id: string, prompt: string, attachments = []) =>
    chat.sendToTab(id, prompt, event.sender as WebContents, attachments)
  );
  ipcMain.handle('chat:open-session-id', async (_event, sessionId: string) => {
    const result = await chat.openSessionId(sessionId);
    if (result.ok) {
      watchRecentSessions();
      notifyStatusChanged();
      notifyRecentSessionsChanged();
    }
    return result;
  });
  ipcMain.handle('chat:recent-sessions', (_event, workspacePath?: string) => chat.getRecentSessions(workspacePath));
  ipcMain.handle('chat:release-attachments', (_event, ids: string[]) => chat.releaseAttachments(ids));
  ipcMain.handle('chat:workspace-folders', () => chat.getWorkspaceFolders());
  ipcMain.handle('chat:switch-workspace', async (_event, path: string) => {
    const result = await chat.switchWorkspace(path);
    if (result.ok) {
      watchRecentSessions(result.status?.workspacePath);
      notifyStatusChanged();
      notifyRecentSessionsChanged(result.status?.workspacePath);
    }
    return withCachedWorkspace(result);
  });
  ipcMain.handle('chat:tabs:open-session', (_event, id: string) => chat.activateTab(id));
  ipcMain.handle('chat:delete-queued-message', (event, id: string) =>
    chat.deleteQueuedMessage(id, event.sender as WebContents)
  );
  ipcMain.handle('chat:login-subscription', (event, provider: string) =>
    chat.loginSubscription(provider, event.sender as WebContents)
  );
  ipcMain.handle('chat:notices:mark-seen', (_event, sessionId: string) => chat.markSessionNoticeSeen(sessionId));
  ipcMain.handle('chat:prepare-dropped-files', (_event, paths: string[]) => chat.prepareDroppedFiles(paths));
  ipcMain.handle('chat:set-runtime-api-key', (_event, provider: string, apiKey: string) =>
    chat.setRuntimeApiKey(provider, apiKey)
  );
  ipcMain.handle('chat:steer-queued-message', (event, id: string) =>
    chat.steerQueuedMessage(id, event.sender as WebContents)
  );
  ipcMain.handle('chat:cancel-subscription-login', () => chat.cancelSubscriptionLogin());
  ipcMain.handle('chat:prepare-clipboard-image', () => chat.prepareClipboardImage());
  ipcMain.handle('chat:select-thinking-level', async (_event, level: string) => {
    const status = await chat.selectThinkingLevel(level);
    notifyStatusChanged();
    return status;
  });
  ipcMain.handle('chat:choose-workspace-directory', async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender as WebContents);
    const dialogOptions = {
      defaultPath: chat.getWorkspaceCwd(),
      ...openWorkspaceDialogOptions()
    };
    const result = await withComposerBlurSuppressed(() =>
      window ? dialog.showOpenDialog(window, dialogOptions) : dialog.showOpenDialog(dialogOptions)
    );
    const path = result.filePaths[0];
    if (result.canceled || !path) return { ok: true, cancelled: true, status: await chat.getStatus() };
    rememberWorkspaceBookmark(path, result.bookmarks?.[0]);
    const nextResult = await chat.switchWorkspace(path);
    if (nextResult.ok) {
      watchRecentSessions(nextResult.status?.workspacePath);
      notifyStatusChanged();
      notifyRecentSessionsChanged(nextResult.status?.workspacePath);
    }
    return withCachedWorkspace(nextResult);
  });
  ipcMain.handle('chat:submit-subscription-auth-input', (_event, value: string) =>
    chat.submitSubscriptionAuthInput(value)
  );
};
