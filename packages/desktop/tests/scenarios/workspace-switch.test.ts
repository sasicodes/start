import { homedir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { getFakeSession } from '../fakes/agent/index.js';
import { activationLog } from '../fakes/workspace-access.js';
import { getStorageSnapshot } from '../fakes/storage.js';
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

  it('persists lastWorkspace whenever the workspace changes', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    await chat.switchWorkspace('/tmp/workspace-c');

    expect(chat.getWorkspaceCwd()).toBe('/tmp/workspace-c');
    expect(getStorageSnapshot().lastWorkspace).toBe('/tmp/workspace-c');
    expect(activationLog()).toContain('/tmp/workspace-c');
  });

  it('falls back to the user home directory when no workspace was previously saved', () => {
    const chat = freshChatService();
    expect(chat.getWorkspaceCwd()).toBe(homedir());
  });

  it('rejects empty workspace paths without mutating state', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    const result = await chat.switchWorkspace('   ');

    expect(result.ok).toBe(false);
    expect(result.error).toBe('Workspace path is empty.');
    expect(chat.getWorkspaceCwd()).toBe('/tmp/workspace-a');
  });
});
