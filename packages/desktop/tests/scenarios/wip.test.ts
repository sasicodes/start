import { describe, expect, it } from 'vitest';
import { getFakeSession } from '../fakes/agent/index.js';
import { freshChatService, newWebContents } from '../helpers/chat-service.js';

describe('work in progress', () => {
  it('reports streaming sessions across active and background workspaces', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    const webContents = newWebContents();

    const tab = await chat.createTab('/tmp/workspace-a');
    expect(chat.workInProgress()).toBe(false);

    const sendPromise = chat.send('first message', webContents);
    const session = getFakeSession(tab.id);
    await session?.awaitPromptCall();
    expect(chat.workInProgress()).toBe(true);

    await chat.switchWorkspace('/tmp/workspace-b');
    expect(chat.workInProgress()).toBe(true);

    session?.finishPrompt();
    await sendPromise;
    expect(chat.workInProgress()).toBe(false);
  });
});
