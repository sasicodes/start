import { describe, expect, it } from 'vitest';
import { getFakeSession } from '../fakes/agent/index.js';
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
    activeSession?.finishPrompt();
    await send;
  });
});
