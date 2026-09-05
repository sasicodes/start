import type { QueuedMessage } from '@main/types';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getFakeSession } from '../../fakes/agent/index.js';
import { eventsByChannel } from '../../fakes/electron.js';
import { freshChatService, newWebContents } from '../../helpers/chat-service.js';
import { deferred } from '../../helpers/deferred.js';

let cleanup = async () => {};

afterEach(async () => {
  await cleanup();
});

const startQueue = async (texts = ['first queued', 'second queued']) => {
  const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
  const webContents = newWebContents();
  const tab = await chat.createTab('/tmp/workspace-a');
  const send = chat.send('initial message', webContents);
  const session = getFakeSession(tab.id);
  if (!session) throw new Error('Expected fake session.');
  await session.awaitPromptCall();
  for (const text of texts) await chat.send(text, webContents);
  const messages = (): QueuedMessage[] => {
    const update = eventsByChannel(webContents, 'chat:queue-update').at(-1);
    return update ? (update.args[0] as QueuedMessage[]) : [];
  };
  const ids = messages().map((message) => message.id);
  const stop = async () => {
    await chat.abort();
    session.finishPrompt();
    await send;
  };
  cleanup = async () => {
    await stop();
    chat.dispose();
  };
  return { chat, session, webContents, messages, ids, stop };
};

describe('editing queued messages', () => {
  it('holds a recalled follow-up and rejects send and steer until editing finishes', async () => {
    const { chat, session, webContents, messages, ids } = await startQueue();
    const id = ids[1] ?? '';

    expect(await chat.setQueuedMessageEditing(id, true, webContents)).toBe(true);
    expect(session.followUpQueue).toEqual(['first queued']);
    expect(messages()).toContainEqual(expect.objectContaining({ id, editing: true }));

    await chat.sendQueuedMessage(id, webContents);
    await chat.steerQueuedMessage(id, webContents);

    expect(session.followUpQueue).toEqual(['first queued']);
    expect(session.steerQueue).toEqual([]);
    expect(messages().find((message) => message.id === id)?.kind).toBe('followUp');
  });

  it('holds an already steered item without blocking other queued items', async () => {
    const { chat, session, webContents, messages, ids } = await startQueue();
    const id = ids[0] ?? '';
    await chat.steerQueuedMessage(id, webContents);

    await chat.setQueuedMessageEditing(id, true, webContents);

    expect(session.steerQueue).toEqual([]);
    expect(session.followUpQueue).toEqual(['second queued']);
    expect(messages()[0]).toMatchObject({ id, kind: 'steer', editing: true });
  });

  it('preserves the held item when another identical message is delivered', async () => {
    const { chat, session, webContents, messages, ids } = await startQueue(['repeat', 'repeat']);
    const id = ids[1] ?? '';
    await chat.setQueuedMessageEditing(id, true, webContents);

    session.followUpQueue = [];
    session.pushEvent({ type: 'queue_update', steering: [], followUp: [] });
    session.pushEvent({ type: 'message_start', message: { role: 'user', content: 'repeat' } });

    expect(messages()).toEqual([expect.objectContaining({ id, editing: true })]);
    expect(eventsByChannel(webContents, 'chat:queued-turn-start').at(-1)?.args[0]).toMatchObject({ id: ids[0] });
  });

  it.each(['second queued', 'updated text'])('releases a saved edit with text %s', async (text) => {
    const { chat, session, webContents, messages, ids } = await startQueue();
    const id = ids[1] ?? '';
    await chat.setQueuedMessageEditing(id, true, webContents);

    expect(await chat.editQueuedMessage(id, text, webContents)).toBe(true);

    expect(session.followUpQueue).toEqual(['first queued', text]);
    expect(messages().find((message) => message.id === id)).toEqual({ id, text, kind: 'followUp' });
  });

  it('keeps an empty edit held', async () => {
    const { chat, session, webContents, messages, ids } = await startQueue();
    const id = ids[1] ?? '';
    await chat.setQueuedMessageEditing(id, true, webContents);

    expect(await chat.editQueuedMessage(id, '   ', webContents)).toBe(false);
    expect(session.followUpQueue).toEqual(['first queued']);
    expect(messages()[1]?.editing).toBe(true);
  });

  it('restores the hold and original text when saving fails', async () => {
    const { chat, session, webContents, messages, ids } = await startQueue();
    const id = ids[1] ?? '';
    await chat.setQueuedMessageEditing(id, true, webContents);
    const followUp = session.followUp.bind(session);
    vi.spyOn(session, 'followUp').mockImplementation(async (text, images) => {
      if (text === '/invalid') throw new Error('Cannot queue this command.');
      await followUp(text, images);
    });

    expect(await chat.editQueuedMessage(id, '/invalid', webContents)).toBe(false);
    expect(session.followUpQueue).toEqual(['first queued']);
    expect(messages()[1]).toMatchObject({ id, text: 'second queued', editing: true });
  });

  it('preserves images while editing and saving', async () => {
    const { chat, session, webContents, messages } = await startQueue([]);
    const dropped = await chat.prepareDroppedFiles(['/tmp/queued-image.png']);
    await chat.send('image prompt', webContents, dropped.attachments);
    const id = messages()[0]?.id ?? '';
    await chat.setQueuedMessageEditing(id, true, webContents);
    expect(session.followUpQueue).toEqual([]);
    expect(messages()[0]).toMatchObject({ id, editing: true, attachmentCount: 1 });

    expect(await chat.editQueuedMessage(id, 'revised image prompt', webContents)).toBe(true);
    expect(session.followUpQueue).toEqual(['revised image prompt\n[image 1]']);
    expect(session.followUpImages[0]).toEqual([{ type: 'image', data: 'base64-0', mimeType: 'image/png' }]);
  });

  it('restores the original position and kind on cancel', async () => {
    const { chat, session, webContents, messages, ids } = await startQueue();
    const id = ids[0] ?? '';
    await chat.steerQueuedMessage(id, webContents);
    await chat.setQueuedMessageEditing(id, true, webContents);

    expect(await chat.setQueuedMessageEditing(id, false, webContents)).toBe(true);

    expect(session.steerQueue).toEqual(['first queued']);
    expect(session.followUpQueue).toEqual(['second queued']);
    expect(messages()[0]).toEqual({ id, text: 'first queued', kind: 'steer' });
  });

  it('retains the hold through abort and a later prompt', async () => {
    const { chat, session, webContents, ids, stop } = await startQueue();
    const id = ids[1] ?? '';
    await chat.setQueuedMessageEditing(id, true, webContents);
    await stop();
    await chat.sendQueuedMessage(id, webContents);
    expect(session.followUpQueue).toEqual([]);

    const send = chat.send('new prompt', webContents);
    await session.awaitPromptCall();
    expect(session.followUpQueue).toEqual(['first queued']);
    session.finishPrompt();
    await send;
  });

  it('stops a superseded rebuild from putting the edited item back', async () => {
    const { chat, session, webContents, ids } = await startQueue();
    const gate = deferred<void>();
    const followUp = session.followUp.bind(session);
    vi.spyOn(session, 'followUp').mockImplementationOnce(async (text, images) => {
      await followUp(text, images);
      await gate.promise;
    });
    const reorder = chat.reorderQueuedMessages(ids, webContents);
    await chat.setQueuedMessageEditing(ids[1] ?? '', true, webContents);
    gate.resolve();
    await reorder;

    expect(session.followUpQueue).toEqual(['first queued']);
  });

  it('stops a pending rebuild when the queue is aborted', async () => {
    const { chat, session, webContents, ids } = await startQueue();
    const gate = deferred<void>();
    const followUp = session.followUp.bind(session);
    vi.spyOn(session, 'followUp').mockImplementationOnce(async (text, images) => {
      await followUp(text, images);
      await gate.promise;
    });
    const reorder = chat.reorderQueuedMessages(ids, webContents);
    await chat.abort();
    gate.resolve();
    await reorder;

    expect(session.followUpQueue).toEqual([]);
  });

  it('can release the previous session hold after switching workspaces', async () => {
    const { chat, session, webContents, ids } = await startQueue();
    const id = ids[1] ?? '';
    await chat.setQueuedMessageEditing(id, true, webContents);
    await chat.switchWorkspace('/tmp/workspace-b');

    expect(await chat.setQueuedMessageEditing(id, false, webContents)).toBe(true);
    expect(session.followUpQueue).toEqual(['first queued', 'second queued']);
  });

  it('removes a held item without re-queuing it', async () => {
    const { chat, session, webContents, messages, ids } = await startQueue();
    const id = ids[1] ?? '';
    await chat.setQueuedMessageEditing(id, true, webContents);
    await chat.deleteQueuedMessage(id, webContents);

    expect(await chat.setQueuedMessageEditing(id, false, webContents)).toBe(false);
    expect(session.followUpQueue).toEqual(['first queued']);
    expect(messages().map((message) => message.id)).toEqual([ids[0]]);
  });

  it('rejects an item that has already left the queue', async () => {
    const { chat, session, webContents, ids } = await startQueue();
    session.followUpQueue = [];
    session.pushEvent({ type: 'queue_update', steering: [], followUp: [] });

    expect(await chat.setQueuedMessageEditing(ids[0] ?? '', true, webContents)).toBe(false);
  });
});
