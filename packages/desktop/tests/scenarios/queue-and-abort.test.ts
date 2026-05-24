import { describe, expect, it } from 'vitest';
import { getFakeSession } from '../fakes/agent/index.js';
import { eventsByChannel } from '../fakes/electron.js';
import { freshChatService, newWebContents } from '../helpers/chat-service.js';

describe('queue and abort', () => {
  it('queues a follow-up while streaming, then clears the queue on abort', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    const webContents = newWebContents();

    const tab = await chat.createTab('/tmp/workspace-a');
    const firstSend = chat.send('first message', webContents);
    const session = getFakeSession(tab.id);
    expect(session).toBeDefined();
    await session?.awaitPromptCall();
    expect(session?.isStreaming).toBe(true);

    const queuedResult = await chat.send('queued follow-up', webContents);
    expect(queuedResult.ok).toBe(true);
    expect(queuedResult.queued).toBe(true);
    expect(session?.followUpQueue).toEqual(['queued follow-up']);

    const queueUpdates = eventsByChannel(webContents, 'chat:queue-update');
    expect(queueUpdates.length).toBeGreaterThan(0);
    const lastQueueUpdate = queueUpdates.at(-1)?.args[0] as { text: string }[];
    expect(lastQueueUpdate.map((message) => message.text)).toEqual(['queued follow-up']);

    await chat.abort(webContents);
    session?.finishPrompt();
    await firstSend;

    const finalQueueUpdate = eventsByChannel(webContents, 'chat:queue-update').at(-1)?.args[0] as unknown[];
    expect(finalQueueUpdate).toEqual([]);
  });

  it('rejects a queued send when no stream is in flight', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    const webContents = newWebContents();

    await chat.createTab('/tmp/workspace-a');
    const result = await chat.send('   ', webContents);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Prompt is empty.');
  });
});
