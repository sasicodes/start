import { describe, expect, it } from 'vitest';
import { getFakeSession } from '../fakes/agent/index.js';
import { freshChatService, newWebContents } from '../helpers/chat-service.js';

describe('session lifecycle', () => {
  it('disposes a session and removes it from getTabs when closed', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    const webContents = newWebContents();

    const tab = await chat.createTab('/tmp/workspace-a');
    const sendPromise = chat.send('hello', webContents);
    const session = getFakeSession(tab.id);
    await session?.awaitPromptCall();
    session?.finishPrompt();
    await sendPromise;

    expect(chat.getTabs().some((entry) => entry.id === tab.id)).toBe(true);

    await chat.closeTab(tab.id);

    expect(session?.disposed).toBe(true);
    expect(chat.getTabs().some((entry) => entry.id === tab.id)).toBe(false);
  });

  it('newSession parks the current tab to the background and clears the active id', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    const webContents = newWebContents();

    const tab = await chat.createTab('/tmp/workspace-a');
    const sendPromise = chat.send('hi', webContents);
    const session = getFakeSession(tab.id);
    await session?.awaitPromptCall();
    session?.finishPrompt();
    await sendPromise;

    await chat.newSession();
    const status = await chat.getStatus();
    expect(status.sessionId).toBeUndefined();

    const tabs = chat.getTabs();
    expect(tabs.some((entry) => entry.id === tab.id)).toBe(true);
  });

  it('rejects an empty prompt without creating a session', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    const webContents = newWebContents();

    const result = await chat.send('   \n  ', webContents);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Prompt is empty.');
  });
});
