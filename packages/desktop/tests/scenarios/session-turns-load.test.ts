import { describe, expect, it } from 'vitest';
import { getFakeSession } from '../fakes/agent/index.js';
import { freshChatService, newWebContents } from '../helpers/chat-service.js';

describe('session turns on load', () => {
  it('returns full history on every open and never an empty streaming placeholder', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    const webContents = newWebContents();

    const tab = await chat.createTab('/tmp/workspace-a');
    const sendPromise = chat.send('first message', webContents);
    const session = getFakeSession(tab.id);
    await session?.awaitPromptCall();
    session?.finishPrompt();
    await sendPromise;

    const firstReopen = await chat.openSession(tab.id);
    const secondReopen = await chat.openSession(tab.id);

    expect(firstReopen.ok).toBe(true);
    expect(secondReopen.ok).toBe(true);
    expect(firstReopen.turns).toEqual(secondReopen.turns);
    const turns = secondReopen.turns ?? [];
    expect(turns.length).toBeGreaterThan(0);
    expect(turns.every((turn) => !turn.streaming || turn.text.length > 0)).toBe(true);
  });

  it('omits the live turn when streaming has no captured content yet', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    const webContents = newWebContents();

    const tab = await chat.createTab('/tmp/workspace-a');
    const send = chat.send('mid-stream', webContents);
    const session = getFakeSession(tab.id);
    await session?.awaitPromptCall();
    expect(session?.isStreaming).toBe(true);

    const reopened = await chat.openSession(tab.id);
    const streamingTurns = reopened.turns?.filter((turn) => turn.streaming) ?? [];
    for (const turn of streamingTurns) {
      expect(turn.text.length + (turn.thinking?.length ?? 0)).toBeGreaterThan(0);
    }

    session?.finishPrompt();
    await send;
  });
});
