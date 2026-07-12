import { describe, expect, it } from 'vitest';
import { getFakeSession } from '../fakes/agent/index.js';
import { eventsByChannel } from '../fakes/electron.js';
import { freshChatService, newWebContents } from '../helpers/chat-service.js';

describe('queue and abort', () => {
  it('queues a follow-up while streaming, then pauses the queue on abort', async () => {
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

    await chat.abort();
    session?.finishPrompt();
    await firstSend;

    expect(session?.followUpQueue).toEqual([]);
    const finalQueueUpdate = eventsByChannel(webContents, 'chat:queue-update').at(-1)?.args[0] as { text: string }[];
    expect(finalQueueUpdate.map((message) => message.text)).toEqual(['queued follow-up']);
  });

  it('re-queues paused messages behind the next prompt after an abort', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    const webContents = newWebContents();

    const tab = await chat.createTab('/tmp/workspace-a');
    const firstSend = chat.send('first message', webContents);
    const session = getFakeSession(tab.id);
    if (!session) throw new Error('Expected fake session.');
    await session.awaitPromptCall();

    await chat.send('queued follow-up', webContents);
    await chat.abort();
    session.finishPrompt();
    await firstSend;
    expect(session.followUpQueue).toEqual([]);

    const secondSend = chat.send('next message', webContents);
    await session.awaitPromptCall();
    expect(session.followUpQueue).toEqual(['queued follow-up']);

    session.finishPrompt();
    await secondSend;
  });

  it('sends a queued message immediately when idle and re-queues the rest', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    const webContents = newWebContents();

    const tab = await chat.createTab('/tmp/workspace-a');
    const firstSend = chat.send('first message', webContents);
    const session = getFakeSession(tab.id);
    if (!session) throw new Error('Expected fake session.');
    await session.awaitPromptCall();

    await chat.send('queued one', webContents);
    await chat.send('queued two', webContents);
    await chat.abort();
    session.finishPrompt();
    await firstSend;

    const queued = eventsByChannel(webContents, 'chat:queue-update').at(-1)?.args[0] as { id: string; text: string }[];
    const first = queued.find((message) => message.text === 'queued one');
    if (!first) throw new Error('Expected queued message.');

    const remaining = await chat.sendQueuedMessage(first.id, webContents);
    expect(remaining.map((message) => message.text)).toEqual(['queued two']);

    await session.awaitPromptCall();
    expect(session.followUpQueue).toEqual(['queued two']);

    session.pushEvent({ type: 'message_start', message: { role: 'user', content: 'queued one' } });
    expect(eventsByChannel(webContents, 'chat:queued-turn-start').at(-1)?.args[0]).toEqual(
      expect.objectContaining({ text: 'queued one' })
    );

    session.finishPrompt();
  });

  it('steers instead of sending when a queued send races an active stream', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    const webContents = newWebContents();

    const tab = await chat.createTab('/tmp/workspace-a');
    const firstSend = chat.send('first message', webContents);
    const session = getFakeSession(tab.id);
    if (!session) throw new Error('Expected fake session.');
    await session.awaitPromptCall();

    await chat.send('queued follow-up', webContents);
    const queued = eventsByChannel(webContents, 'chat:queue-update').at(-1)?.args[0] as { id: string }[];

    const result = await chat.sendQueuedMessage(queued[0]?.id ?? '', webContents);
    expect(result).toEqual([expect.objectContaining({ kind: 'steer', text: 'queued follow-up' })]);
    expect(session.steerQueue).toEqual(['queued follow-up']);

    await chat.abort();
    session.finishPrompt();
    await firstSend;
  });

  it('keeps image attachments on queued follow-ups and steering changes', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    const webContents = newWebContents();

    const tab = await chat.createTab('/tmp/workspace-a');
    const firstSend = chat.send('first message', webContents);
    const session = getFakeSession(tab.id);
    expect(session).toBeDefined();
    await session?.awaitPromptCall();

    const dropped = await chat.prepareDroppedFiles(['/tmp/queued-image.png']);
    const attachment = dropped.attachments[0];
    if (!attachment) throw new Error('Expected image attachment.');

    const queuedResult = await chat.send('queued with image', webContents, [attachment]);
    expect(queuedResult.ok).toBe(true);
    expect(queuedResult.queued).toBe(true);
    expect(session?.followUpImages[0]).toEqual([{ type: 'image', data: 'base64-0', mimeType: 'image/png' }]);

    const queued = eventsByChannel(webContents, 'chat:queue-update').at(-1)?.args[0] as {
      id: string;
      kind: string;
      text: string;
      attachmentCount?: number;
    }[];
    expect(queued).toEqual([
      expect.objectContaining({ kind: 'followUp', text: 'queued with image', attachmentCount: 1 })
    ]);

    const steered = await chat.steerQueuedMessage(queued[0]?.id ?? '', webContents);
    expect(steered).toEqual([
      expect.objectContaining({ kind: 'steer', text: 'queued with image', attachmentCount: 1 })
    ]);
    expect(session?.steerImages[0]).toEqual([{ type: 'image', data: 'base64-0', mimeType: 'image/png' }]);

    await chat.abort();
    session?.finishPrompt();
    await firstSend;
  });

  it('moves a delivered follow-up from the queue into the turn stream', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    const webContents = newWebContents();

    const tab = await chat.createTab('/tmp/workspace-a');
    const firstSend = chat.send('first message', webContents);
    const session = getFakeSession(tab.id);
    if (!session) throw new Error('Expected fake session.');
    await session.awaitPromptCall();

    const queuedResult = await chat.send('queued follow-up', webContents);
    expect(queuedResult.ok).toBe(true);

    session.followUpQueue = [];
    session.pushEvent({ type: 'queue_update', steering: [], followUp: [] });
    session.pushEvent({ type: 'message_start', message: { role: 'user', content: 'queued follow-up' } });

    expect(eventsByChannel(webContents, 'chat:queue-update').at(-1)?.args[0]).toEqual([]);
    expect(eventsByChannel(webContents, 'chat:queued-turn-start').at(-1)?.args[0]).toEqual(
      expect.objectContaining({ text: 'queued follow-up' })
    );

    await chat.abort();
    session.finishPrompt();
    await firstSend;
  });

  it('keeps the later duplicate follow-up queued when the first one starts', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    const webContents = newWebContents();

    const tab = await chat.createTab('/tmp/workspace-a');
    const firstSend = chat.send('first message', webContents);
    const session = getFakeSession(tab.id);
    if (!session) throw new Error('Expected fake session.');
    await session.awaitPromptCall();

    await chat.send('repeat follow-up', webContents);
    await chat.send('repeat follow-up', webContents);

    const queuedBeforeDelivery = eventsByChannel(webContents, 'chat:queue-update').at(-1)?.args[0] as { id: string }[];
    const secondQueuedMessage = queuedBeforeDelivery[1];
    if (!secondQueuedMessage) throw new Error('Expected duplicate queued message.');

    session.followUpQueue = ['repeat follow-up'];
    session.pushEvent({ type: 'queue_update', steering: [], followUp: ['repeat follow-up'] });
    session.pushEvent({ type: 'message_start', message: { role: 'user', content: 'repeat follow-up' } });

    const queuedAfterDelivery = eventsByChannel(webContents, 'chat:queue-update').at(-1)?.args[0] as { id: string }[];
    const startedTurn = eventsByChannel(webContents, 'chat:queued-turn-start').at(-1)?.args[0] as { id: string };

    expect(queuedAfterDelivery.map((message) => message.id)).toEqual([secondQueuedMessage.id]);
    expect(startedTurn.id).not.toBe(secondQueuedMessage.id);

    await chat.abort();
    session.finishPrompt();
    await firstSend;
  });

  it('keeps a background session queue in sync while another workspace is active', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    const webContents = newWebContents();

    const tab = await chat.createTab('/tmp/workspace-a');
    const firstSend = chat.send('first message', webContents);
    const session = getFakeSession(tab.id);
    if (!session) throw new Error('Expected fake session.');
    await session.awaitPromptCall();

    await chat.send('queued follow-up', webContents);

    const switchToB = await chat.switchWorkspace('/tmp/workspace-b');
    expect(switchToB.ok).toBe(true);

    session.followUpQueue = [];
    session.pushEvent({ type: 'queue_update', steering: [], followUp: [] });
    session.pushEvent({ type: 'message_start', message: { role: 'user', content: 'queued follow-up' } });

    const lastUpdateWhileAway = eventsByChannel(webContents, 'chat:queue-update').at(-1)?.args[0] as {
      text: string;
    }[];
    expect(lastUpdateWhileAway.map((message) => message.text)).toEqual(['queued follow-up']);

    const backToA = await chat.switchWorkspace('/tmp/workspace-a');
    expect(backToA.ok).toBe(true);
    expect(backToA.session?.id).toBe(tab.id);
    expect(backToA.session?.queuedMessages).toEqual([]);

    await chat.abort();
    session.finishPrompt();
    await firstSend;
  });

  it('keeps a paused queue when starting a new session and returning', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    const webContents = newWebContents();

    const tab = await chat.createTab('/tmp/workspace-a');
    const firstSend = chat.send('first message', webContents);
    const session = getFakeSession(tab.id);
    if (!session) throw new Error('Expected fake session.');
    await session.awaitPromptCall();

    await chat.send('queued follow-up', webContents);
    await chat.newSession();
    const reopened = await chat.activateTab(tab.id);

    expect((await chat.getStatus()).isGenerating).toBe(true);
    expect(reopened.queuedMessages?.map((message) => message.text)).toEqual(['queued follow-up']);

    await chat.abort();
    session.finishPrompt();
    await firstSend;
  });

  it('keeps a paused queue when switching tabs and returning', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    const webContents = newWebContents();

    const tab = await chat.createTab('/tmp/workspace-a');
    const firstSend = chat.send('first message', webContents);
    const session = getFakeSession(tab.id);
    if (!session) throw new Error('Expected fake session.');
    await session.awaitPromptCall();

    await chat.send('queued follow-up', webContents);
    await chat.abort();
    session.finishPrompt();
    await firstSend;

    await chat.createTab('/tmp/workspace-a');
    const reopened = await chat.activateTab(tab.id);

    expect(reopened.queuedMessages?.map((message) => message.text)).toEqual(['queued follow-up']);
  });

  it('keeps a paused queue when switching workspaces and returning', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    const webContents = newWebContents();

    const tab = await chat.createTab('/tmp/workspace-a');
    const firstSend = chat.send('first message', webContents);
    const session = getFakeSession(tab.id);
    if (!session) throw new Error('Expected fake session.');
    await session.awaitPromptCall();

    await chat.send('queued follow-up', webContents);
    await chat.abort();
    session.finishPrompt();
    await firstSend;

    await chat.switchWorkspace('/tmp/workspace-b');
    const reopened = await chat.switchWorkspace('/tmp/workspace-a');

    expect(reopened.session?.id).toBe(tab.id);
    expect(reopened.session?.queuedMessages?.map((message) => message.text)).toEqual(['queued follow-up']);
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
