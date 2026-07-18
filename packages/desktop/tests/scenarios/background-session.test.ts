import { describe, expect, it, vi } from 'vitest';
import { getFakeSession } from '../fakes/agent/index.js';
import { broadcastsByChannel } from '../fakes/window.js';
import { freshChatService, newWebContents } from '../helpers/chat-service.js';

describe('background session creation', () => {
  it('starts a new session in the background without stealing focus', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    const webContents = newWebContents();

    const active = await chat.createTab('/tmp/workspace-a');
    const send = chat.send('keep me active', webContents);
    const activeSession = getFakeSession(active.id);
    await activeSession?.awaitPromptCall();

    const summary = await chat.startSession({ prompt: 'work in the background', environment: { type: 'local' } });
    const background = getFakeSession(summary.id);
    await background?.awaitPromptCall();

    expect(summary.id).not.toBe(active.id);
    expect(summary.isolated).toBe(false);
    expect((await chat.getStatus()).sessionId).toBe(active.id);
    expect(chat.getTabs().some((tab) => tab.id === summary.id)).toBe(true);

    background?.finishPrompt();
    await vi.waitFor(() => expect(broadcastsByChannel('chat:notice')).toHaveLength(1));
    expect(broadcastsByChannel('chat:notice')[0]?.args[0]).toMatchObject({
      tabId: summary.id,
      payload: { kind: 'completed', sessionId: summary.id }
    });
    expect(broadcastsByChannel('chat:recent-sessions-changed').at(-1)?.args[0]).toEqual({
      workspacePath: summary.workspacePath
    });

    activeSession?.finishPrompt();
    await send;
  });
});
