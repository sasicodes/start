import { describe, expect, it, vi } from 'vitest';
import { getFakeSession } from '../fakes/agent/index.js';
import { freshChatService, newWebContents } from '../helpers/chat-service.js';

describe('work in progress', () => {
  it('reports streaming sessions across active and background workspaces', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    const webContents = newWebContents();
    const onWorkChanged = vi.fn();
    chat.setWorkChangeHandler(onWorkChanged);

    const tab = await chat.createTab('/tmp/workspace-a');
    expect(chat.workInProgress()).toBe(false);

    const sendPromise = chat.send('first message', webContents);
    const session = getFakeSession(tab.id);
    await session?.awaitPromptCall();
    expect(chat.workInProgress()).toBe(true);
    expect(onWorkChanged).toHaveBeenCalledTimes(1);

    await chat.switchWorkspace('/tmp/workspace-b');
    expect(chat.workInProgress()).toBe(true);

    session?.finishPrompt();
    await sendPromise;
    expect(chat.workInProgress()).toBe(false);
    expect(onWorkChanged).toHaveBeenCalledTimes(2);
  });
});
