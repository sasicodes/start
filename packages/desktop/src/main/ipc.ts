import {
  trackApiKeyAdded,
  trackCommandSent,
  trackModelSelected,
  trackPromptSent,
  trackProviderDisconnected,
  trackSessionCreated,
  trackSubscriptionLoginStarted,
  trackThinkingLevelSelected,
  trackWorkspaceChanged
} from '@main/analytics/events';
import type { ChatService } from '@main/chat';
import type { withComposerBlurSuppressed } from '@main/window';
import { openWorkspaceDialogOptions, rememberWorkspaceBookmark } from '@main/workspace/access';
import type { WebContents } from 'electron';
import electron from 'electron';

const { BrowserWindow, dialog, ipcMain } = electron;

interface ChatIpcOptions {
  chat: ChatService;
  notifyStatusChanged: () => void;
  startNewSession: () => Promise<void>;
  withComposerBlurSuppressed: typeof withComposerBlurSuppressed;
  notifyRecentSessionsChanged: (workspacePath?: string) => void;
  withCachedWorkspace: <T extends { status?: { workspacePath: string } }>(result: T) => Promise<T>;
}

export const registerChatIpc = ({
  chat,
  startNewSession,
  notifyStatusChanged,
  withCachedWorkspace,
  withComposerBlurSuppressed,
  notifyRecentSessionsChanged
}: ChatIpcOptions) => {
  const notifyWorkspaceChanged = (workspacePath?: string) => {
    notifyStatusChanged();
    notifyRecentSessionsChanged(workspacePath);
  };

  const activateTab = async (id: string) => {
    const result = await chat.activateTab(id);
    if (result.ok) notifyWorkspaceChanged();
    return result;
  };

  ipcMain.handle('chat:tabs', () => chat.getTabs());
  ipcMain.handle('chat:abort', (event) => chat.abort(event.sender as WebContents));
  ipcMain.handle('chat:sessions:archive', (_event, sessionId: string) => chat.archiveSession(sessionId));
  ipcMain.handle('chat:sessions:unarchive', (_event, sessionId: string) => chat.unarchiveSession(sessionId));
  ipcMain.handle('chat:models', () => chat.getModels());
  ipcMain.handle('chat:slash-commands', () => chat.getSlashCommands());
  ipcMain.handle('chat:send', async (event, prompt: string, attachments = []) => {
    const result = await chat.send(prompt, event.sender as WebContents, attachments);
    trackPromptSent(chat, {
      ok: result.ok,
      prompt,
      attachments,
      source: 'chat',
      queued: Boolean(result.queued),
      ...(result.sessionId ? { sessionId: result.sessionId } : {})
    });
    if (result.ok) notifyRecentSessionsChanged();
    return result;
  });
  ipcMain.handle('chat:status', () => chat.getStatus());
  ipcMain.handle('chat:command', async (event, command: string, excludeFromContext: boolean) => {
    const result = await chat.command(command, excludeFromContext, event.sender as WebContents);
    trackCommandSent(chat, {
      ok: result.ok,
      command,
      excludeFromContext,
      hasOutput: Boolean(result.output),
      ...(typeof result.exitCode === 'number' ? { exitCode: result.exitCode } : {}),
      ...(result.sessionId ? { sessionId: result.sessionId } : {})
    });
    if (result.ok) notifyRecentSessionsChanged();
    return result;
  });
  ipcMain.handle('chat:tabs:list', () => chat.getTabs());
  ipcMain.handle('chat:new-session', () => startNewSession());
  ipcMain.handle('chat:tabs:abort', async (_event, id: string) => {
    await chat.abortTab(id);
    notifyStatusChanged();
  });
  ipcMain.handle('chat:tabs:close', async (_event, id: string) => {
    await chat.closeTab(id);
    notifyStatusChanged();
    notifyRecentSessionsChanged();
  });
  ipcMain.handle('chat:tabs:create', async (_event, workspacePath?: string) => {
    const tab = await chat.createTab(workspacePath);
    trackSessionCreated('tab', tab.workspacePath);
    notifyWorkspaceChanged(tab.workspacePath);
    return tab;
  });
  ipcMain.handle('chat:tabs:status', () => chat.getStatus());
  ipcMain.handle('chat:notices:list', () => chat.getNotices());
  ipcMain.handle('chat:auth-providers', () => chat.getAuthProviders());
  ipcMain.handle('chat:open-session', async (_event, path: string) => {
    const result = await chat.openSession(path);
    if (result.ok) notifyWorkspaceChanged();
    return result;
  });
  ipcMain.handle('chat:select-model', async (_event, modelKey: string) => {
    const status = await chat.selectModel(modelKey);
    trackModelSelected({
      ok: status.ready,
      modelKey: status.selectedModelKey ?? modelKey,
      ...(status.sessionId ? { sessionId: status.sessionId } : {}),
      ...(status.workspacePath ? { workspacePath: status.workspacePath } : {}),
      ...(status.thinkingLevel ? { thinkingLevel: status.thinkingLevel } : {})
    });
    notifyStatusChanged();
    return status;
  });
  ipcMain.handle('chat:sessions:page', (_event, options = {}) => chat.getRecentSessionsPage(options));
  ipcMain.handle('chat:tabs:activate', (_event, id: string) => activateTab(id));
  ipcMain.handle('chat:tabs:send', async (event, id: string, prompt: string, attachments = []) => {
    const result = await chat.sendToTab(id, prompt, event.sender as WebContents, attachments);
    trackPromptSent(chat, {
      ok: result.ok,
      prompt,
      attachments,
      source: 'tab',
      queued: Boolean(result.queued),
      ...(result.sessionId ? { sessionId: result.sessionId } : {})
    });
    if (result.ok) {
      notifyStatusChanged();
      notifyRecentSessionsChanged();
    }
    return result;
  });
  ipcMain.handle('chat:open-session-id', async (_event, sessionId: string) => {
    const result = await chat.openSessionId(sessionId);
    if (result.ok) notifyWorkspaceChanged();
    return result;
  });
  ipcMain.handle('chat:release-attachments', (_event, ids: string[]) => chat.releaseAttachments(ids));
  ipcMain.handle('chat:workspace-folders', () => chat.getWorkspaceFolders());
  ipcMain.handle('chat:switch-workspace', async (_event, path: string) => {
    const result = await chat.switchWorkspace(path);
    if (result.ok) {
      trackWorkspaceChanged('switcher', result.status?.workspacePath ?? path);
      notifyWorkspaceChanged(result.status?.workspacePath);
    }
    return withCachedWorkspace(result);
  });
  ipcMain.handle('chat:tabs:open-session', (_event, id: string) => activateTab(id));
  ipcMain.handle('chat:delete-queued-message', (event, id: string) =>
    chat.deleteQueuedMessage(id, event.sender as WebContents)
  );
  ipcMain.handle('chat:login-subscription', (event, provider: string) => {
    const providerId = provider.trim().toLowerCase();
    trackSubscriptionLoginStarted(providerId, chat.getWorkspaceCwd());
    return chat.loginSubscription(provider, event.sender as WebContents);
  });
  ipcMain.handle('chat:notices:mark-seen', async (_event, sessionId: string) => {
    await chat.markSessionNoticeSeen(sessionId);
    notifyRecentSessionsChanged();
  });
  ipcMain.handle('chat:prepare-dropped-files', (_event, paths: string[]) => chat.prepareDroppedFiles(paths));
  ipcMain.handle('chat:set-api-key', (_event, provider: string, apiKey: string) => {
    const providerId = provider.trim().toLowerCase();
    if (providerId && apiKey.trim()) {
      trackApiKeyAdded(providerId, chat.getWorkspaceCwd());
    }
    return chat.setApiKey(provider, apiKey);
  });
  ipcMain.handle('chat:disconnect-provider', (_event, provider: string) => {
    const providerId = provider.trim().toLowerCase();
    if (providerId) {
      trackProviderDisconnected(providerId, chat.getWorkspaceCwd());
    }
    return chat.disconnectProvider(provider);
  });
  ipcMain.handle('chat:steer-queued-message', (event, id: string) =>
    chat.steerQueuedMessage(id, event.sender as WebContents)
  );
  ipcMain.handle('chat:cancel-subscription-login', () => chat.cancelSubscriptionLogin());
  ipcMain.handle('chat:prepare-clipboard-image', () => chat.prepareClipboardImage());
  ipcMain.handle('chat:select-thinking-level', async (_event, level: string) => {
    const status = await chat.selectThinkingLevel(level);
    trackThinkingLevelSelected({
      ok: status.ready,
      level,
      ...(status.selectedModelKey ? { modelKey: status.selectedModelKey } : {}),
      ...(status.sessionId ? { sessionId: status.sessionId } : {}),
      ...(status.workspacePath ? { workspacePath: status.workspacePath } : {})
    });
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
      trackWorkspaceChanged('dialog', nextResult.status?.workspacePath ?? path);
      notifyWorkspaceChanged(nextResult.status?.workspacePath);
    }
    return withCachedWorkspace(nextResult);
  });
  ipcMain.handle('chat:submit-subscription-auth-input', (_event, value: string) =>
    chat.submitSubscriptionAuthInput(value)
  );
};
