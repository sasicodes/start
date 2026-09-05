import * as attachments from '@main/attachments';
import type { ImageAttachment } from '@main/types';
import { expect, it, vi } from 'vitest';
import { getFakeSession } from '../fakes/agent/index.js';
import { freshChatService, newWebContents } from '../helpers/chat-service.js';
import { deferred } from '../helpers/deferred.js';

const setup = async () => {
  const chat = freshChatService();
  const tab = await chat.createTab();
  const session = getFakeSession(tab.id);
  if (!session) throw new Error('Missing test session');
  const webContents = newWebContents();
  return { chat, tab, session, webContents };
};

const image: ImageAttachment = {
  id: 'recover-image',
  type: 'image',
  name: 'image.png',
  path: '/tmp/image.png',
  mimeType: 'image/png',
  previewUrl: 'data:image/png;base64,image'
};

it.each(['abort', 'pause', 'cancel'] as const)(
  'does not start a goal after %s during attachment recovery',
  async (action) => {
    const { chat, tab, session, webContents } = await setup();
    const gate = deferred<null>();
    const started = deferred<null>();
    const prompt = vi.spyOn(session, 'prompt');
    vi.spyOn(attachments, 'prepareDroppedFiles').mockImplementationOnce(async () => {
      started.resolve(null);
      await gate.promise;
      return { pathTokens: [], attachments: [] };
    });
    const sending = chat.send('/goal Recover the attachment', webContents, [image]);
    await started.promise;
    if (action === 'abort') await chat.abort();
    else await chat.controlGoal(tab.id, action, webContents);
    gate.resolve(null);
    expect(await sending).toMatchObject({ ok: true });
    expect(prompt).not.toHaveBeenCalled();
    expect((await chat.getStatus()).goal).toMatchObject({
      iterations: 0,
      status: action === 'cancel' ? 'cancelled' : 'paused'
    });
    expect(session.isStreaming).toBe(false);
    chat.dispose();
  }
);

it.each(['abort', 'pause', 'cancel'] as const)(
  'does not requeue a message after %s during attachment recovery',
  async (action) => {
    const { chat, tab, session, webContents } = await setup();
    const sending = chat.send('/goal Keep working', webContents);
    await session.awaitPromptCall();
    const gate = deferred<null>();
    const started = deferred<null>();
    const followUp = vi.spyOn(session, 'followUp');
    vi.spyOn(attachments, 'prepareDroppedFiles').mockImplementationOnce(async () => {
      started.resolve(null);
      await gate.promise;
      return { pathTokens: [], attachments: [] };
    });
    const queueing = chat.send('Recover this queued image', webContents, [image]);
    await started.promise;
    if (action === 'abort') await chat.abort();
    else await chat.controlGoal(tab.id, action, webContents);
    gate.resolve(null);
    expect(await queueing).toEqual({ ok: false, error: 'Request stopped.' });
    await sending;
    expect(followUp).not.toHaveBeenCalled();
    expect(session.followUpQueue).toEqual([]);
    expect((await chat.openSessionId(tab.id)).queuedMessages).toEqual([]);
    chat.dispose();
  }
);

it('continues after a settled goal response and emits a new visible turn', async () => {
  const { chat, tab, session, webContents } = await setup();
  const sending = chat.send('/goal Complete two steps', webContents);
  await session.awaitPromptCall();
  expect((await chat.getStatus()).goal).toMatchObject({ status: 'active', iterations: 1 });
  session.finishPrompt();
  await session.awaitPromptCall();
  expect((await chat.getStatus()).goal).toMatchObject({ status: 'active', iterations: 2 });
  expect(webContents.events.some((event) => event.channel === 'chat:queued-turn-start')).toBe(true);
  await chat.controlGoal(tab.id, 'pause', webContents);
  await sending;
  expect((await chat.getStatus()).goal?.status).toBe('paused');
  chat.dispose();
});

it('explicitly resumes a paused goal and cancels its next run', async () => {
  const { chat, tab, session, webContents } = await setup();
  const sending = chat.send('/goal Work until complete', webContents);
  await session.awaitPromptCall();
  await chat.abort();
  await sending;
  expect((await chat.getStatus()).goal?.status).toBe('paused');
  await chat.controlGoal(tab.id, 'resume', webContents);
  await session.awaitPromptCall();
  expect((await chat.getStatus()).goal).toMatchObject({ status: 'active', iterations: 2 });
  await chat.controlGoal(tab.id, 'cancel', webContents);
  expect((await chat.getStatus()).goal?.status).toBe('cancelled');
  chat.dispose();
});

it('pauses on a model error without automatically retrying the goal', async () => {
  const { chat, session, webContents } = await setup();
  const sending = chat.send('/goal Complete the task', webContents);
  await session.awaitPromptCall();
  session.failPrompt('Provider unavailable');
  expect(await sending).toMatchObject({ ok: false });
  expect((await chat.getStatus()).goal).toMatchObject({ status: 'paused', iterations: 1 });
  expect(session.isStreaming).toBe(false);
  chat.dispose();
});

it('keeps a goal tied to its original session across a chat switch', async () => {
  const { chat, tab, session, webContents } = await setup();
  const sending = chat.send('/goal Finish in this chat', webContents);
  await session.awaitPromptCall();
  await chat.newSession();
  expect((await chat.getStatus()).goal).toBeFalsy();
  session.finishPrompt();
  await session.awaitPromptCall();
  expect((await chat.getStatus()).goal).toBeFalsy();
  expect((await chat.controlGoal(tab.id, 'cancel')).ready).toBe(false);
  await chat.abortTab(tab.id);
  await sending;
  chat.dispose();
});

it('pauses before continuing while a queued message is being edited', async () => {
  const { chat, tab, session, webContents } = await setup();
  const sending = chat.send('/goal Finish the task', webContents);
  await session.awaitPromptCall();
  await chat.send('Held message', webContents);
  const [queued] = (await chat.openSessionId(tab.id)).queuedMessages ?? [];
  if (!queued) throw new Error('Missing queued message');
  await chat.setQueuedMessageEditing(queued.id, true, webContents);
  session.finishPrompt();
  await sending;
  expect((await chat.getStatus()).goal).toMatchObject({ status: 'paused', iterations: 1 });
  expect(session.followUpQueue).toEqual([]);
  chat.dispose();
});

it('does not add an automatic loop to an ordinary message', async () => {
  const { chat, session, webContents } = await setup();
  const sending = chat.send('hello', webContents);
  await session.awaitPromptCall();
  session.finishPrompt();
  expect(await sending).toMatchObject({ ok: true });
  expect((await chat.getStatus()).goal).toBeFalsy();
  chat.dispose();
});

it('stops continuation when the tab closes', async () => {
  const { chat, tab, session, webContents } = await setup();
  const sending = chat.send('/goal Finish later', webContents);
  await session.awaitPromptCall();
  await chat.closeTab(tab.id);
  await sending;
  expect(session.disposed).toBe(true);
  chat.dispose();
});

it('accepts and steers user input while a goal prompt is starting', async () => {
  const { chat, tab, session, webContents } = await setup();
  const gate = deferred<null>();
  const started = deferred<null>();
  const prompt = session.prompt.bind(session);
  vi.spyOn(session, 'prompt').mockImplementationOnce(async (text, options) => {
    started.resolve(null);
    await gate.promise;
    await prompt(text, options);
  });
  const sending = chat.send('/goal Test startup delivery', webContents);
  await started.promise;
  expect(session.isStreaming).toBe(false);
  expect(await chat.send('New instructions', webContents)).toMatchObject({ ok: true, queued: true });
  const [queued] = (await chat.openSessionId(tab.id)).queuedMessages ?? [];
  if (!queued) throw new Error('Missing queued message');
  await chat.steerQueuedMessage(queued.id, webContents);
  expect(session.steerQueue).toEqual(['New instructions']);
  expect(session.followUpQueue).toEqual([]);
  gate.resolve(null);
  await session.awaitPromptCall();
  await chat.abort();
  await sending;
  chat.dispose();
});

it('preserves held input, steering, reordering, and deletion during a goal', async () => {
  const { chat, tab, session, webContents } = await setup();
  const sending = chat.send('/goal Keep working', webContents);
  await session.awaitPromptCall();
  await chat.send('First', webContents);
  await chat.send('Second', webContents);
  const queued = (await chat.openSessionId(tab.id)).queuedMessages ?? [];
  const first = queued.find((message) => message.text === 'First');
  const second = queued.find((message) => message.text === 'Second');
  if (!first || !second) throw new Error('Missing queued messages');
  await chat.setQueuedMessageEditing(second.id, true, webContents);
  await chat.steerQueuedMessage(first.id, webContents);
  expect(session.steerQueue).toEqual(['First']);
  expect(session.followUpQueue).toEqual([]);
  await chat.sendQueuedMessage(second.id, webContents);
  expect(session.steerQueue).toEqual(['First']);
  await chat.reorderQueuedMessages([second.id, first.id], webContents);
  expect(session.followUpQueue).toEqual([]);
  await chat.deleteQueuedMessage(first.id, webContents);
  expect(session.steerQueue).toEqual([]);
  expect(await chat.editQueuedMessage(second.id, 'Updated', webContents)).toBe(true);
  expect(session.followUpQueue).toEqual(['Updated']);
  await chat.abort();
  await sending;
  chat.dispose();
});
