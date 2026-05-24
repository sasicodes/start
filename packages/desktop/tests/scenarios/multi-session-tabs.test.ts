import { describe, expect, it } from 'vitest';
import { getFakeSession } from '../fakes/agent/index.js';
import { freshChatService, newWebContents } from '../helpers/chat-service.js';

describe('multi-session tabs', () => {
  it('tracks tabs across two workspaces and keeps the right session active per workspace', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    const webContents = newWebContents();

    const tabA = await chat.createTab('/tmp/workspace-a');
    expect(tabA.workspacePath).toBe('/tmp/workspace-a');

    const sendA = chat.send('hello A', webContents);
    const sessionA = getFakeSession(tabA.id);
    expect(sessionA).toBeDefined();
    await sessionA?.awaitPromptCall();
    sessionA?.finishPrompt();
    await sendA;

    const switchToB = await chat.switchWorkspace('/tmp/workspace-b');
    expect(switchToB.ok).toBe(true);

    const tabB = await chat.createTab('/tmp/workspace-b');
    const sendB = chat.send('hello B', webContents);
    const sessionB = getFakeSession(tabB.id);
    await sessionB?.awaitPromptCall();
    sessionB?.finishPrompt();
    await sendB;

    const tabs = chat.getTabs();
    const workspaces = tabs.map((tab) => tab.workspacePath).sort();
    expect(workspaces).toEqual(['/tmp/workspace-a', '/tmp/workspace-b']);

    expect(chat.getWorkspaceCwd()).toBe('/tmp/workspace-b');

    const backToA = await chat.switchWorkspace('/tmp/workspace-a');
    expect(backToA.ok).toBe(true);
    expect(chat.getWorkspaceCwd()).toBe('/tmp/workspace-a');

    const status = await chat.getStatus();
    expect(status.sessionId).toBe(tabA.id);
  });
});
