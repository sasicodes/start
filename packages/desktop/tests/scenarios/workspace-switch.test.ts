import { homedir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { getFakeSession } from '../fakes/agent/index.js';
import { getStorageSnapshot } from '../fakes/storage.js';
import { activationLog } from '../fakes/workspace-access.js';
import { freshChatService, newWebContents } from '../helpers/chat-service.js';

describe('workspace switching', () => {
  it('moves the current session to background and restores it when the workspace is reopened', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    const webContents = newWebContents();

    const tabA = await chat.createTab('/tmp/workspace-a');
    const sendA = chat.send('one', webContents);
    const sessionA = getFakeSession(tabA.id);
    await sessionA?.awaitPromptCall();

    const switchToB = await chat.switchWorkspace('/tmp/workspace-b');
    expect(switchToB.ok).toBe(true);
    expect(chat.getWorkspaceCwd()).toBe('/tmp/workspace-b');

    const tabsAfterSwitch = chat.getTabs();
    const stillReporting = tabsAfterSwitch.find((tab) => tab.id === tabA.id);
    expect(stillReporting?.status).toBe('generating');

    sessionA?.finishPrompt();
    await sendA;

    const backToA = await chat.switchWorkspace('/tmp/workspace-a');
    expect(backToA.ok).toBe(true);
    expect((await chat.getStatus()).sessionId).toBe(tabA.id);
  });

  it('does not reset the active session when selecting the current workspace', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    const webContents = newWebContents();

    const tab = await chat.createTab('/tmp/workspace-a');
    const send = chat.send('one', webContents);
    const session = getFakeSession(tab.id);
    if (!session) throw new Error('Expected fake session.');
    await session.awaitPromptCall();

    const result = await chat.switchWorkspace('/tmp/workspace-a');
    const status = await chat.getStatus();

    expect(result).toEqual(expect.objectContaining({ ok: true, unchanged: true }));
    expect(chat.getWorkspaceCwd()).toBe('/tmp/workspace-a');
    expect(status.sessionId).toBe(tab.id);
    expect(status.isGenerating).toBe(true);

    await chat.abort(webContents);
    session.finishPrompt();
    await send;
  });

  it('persists lastWorkspace whenever the workspace changes', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    await chat.switchWorkspace('/tmp/workspace-c');

    expect(chat.getWorkspaceCwd()).toBe('/tmp/workspace-c');
    expect(getStorageSnapshot().lastWorkspace).toBe('/tmp/workspace-c');
    expect(activationLog()).toContain('/tmp/workspace-c');
  });

  it('keeps the previous workspace in history when switching', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    await chat.switchWorkspace('/tmp/workspace-c');

    const history = getStorageSnapshot().workspaceHistory ?? {};
    expect(history).toHaveProperty('/tmp/workspace-a');
    expect(history).toHaveProperty('/tmp/workspace-c');
  });

  it('shows remembered workspaces even before they have sessions', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    await chat.switchWorkspace('/tmp/workspace-c');

    expect((await chat.getWorkspaceFolders()).map((folder) => folder.path)).toEqual([
      '/tmp/workspace-c',
      '/tmp/workspace-a'
    ]);
  });

  it('falls back to the user home directory when no workspace was previously saved', () => {
    const chat = freshChatService();
    expect(chat.getWorkspaceCwd()).toBe(homedir());
    expect(getStorageSnapshot().workspaceHistory).toHaveProperty(homedir());
  });

  it('rejects empty workspace paths without mutating state', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    const result = await chat.switchWorkspace('   ');

    expect(result.ok).toBe(false);
    expect(result.error).toBe('Workspace path is empty.');
    expect(chat.getWorkspaceCwd()).toBe('/tmp/workspace-a');
  });
});
