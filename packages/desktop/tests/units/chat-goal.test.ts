import { SessionManager } from '@earendil-works/pi-coding-agent';
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

it.each([
  ['@Goal Finish the work', 'Finish the work'],
  ['Please @gOaL inspect @src/main.ts', 'Please inspect @src/main.ts'],
  ['@Goal\nKeep\nformatting', 'Keep\nformatting']
])('starts a goal from standalone mention: %s', async (text, objective) => {
  const { chat, session, webContents } = await setup();
  const sending = chat.send(text, webContents);
  await session.awaitPromptCall();
  expect((await chat.getStatus()).goal).toMatchObject({ objective, status: 'active' });
  await chat.abort();
  await sending;
  chat.dispose();
});

it.each(['mention@goal.com', '@goalkeeper inspect', 'Open @Goal/file.ts'])(
  'does not treat %s as a goal marker',
  async (text) => {
    const { chat, session, webContents } = await setup();
    const sending = chat.send(text, webContents);
    await session.awaitPromptCall();
    expect((await chat.getStatus()).goal).toBeFalsy();
    session.finishPrompt();
    await sending;
    chat.dispose();
  }
);

it('rejects an empty goal mention and omits goal from slash discovery', async () => {
  const { chat, webContents } = await setup();
  expect(await chat.send('@Goal', webContents)).toEqual({ ok: false, error: 'Add an objective after @Goal.' });
  expect((await chat.getSlashCommands()).some((item) => item.name === 'goal')).toBe(false);
  expect((await chat.getStatus()).goal).toBeFalsy();
  chat.dispose();
});

it('queues goal mentions as ordinary input while a goal already exists', async () => {
  const { chat, tab, session, webContents } = await setup();
  const sending = chat.send('@Goal Original objective', webContents);
  await session.awaitPromptCall();
  expect(await chat.send('Please @Goal also inspect @src', webContents)).toMatchObject({ ok: true, queued: true });
  expect((await chat.getStatus()).goal?.objective).toBe('Original objective');
  const queued = (await chat.openSessionId(tab.id)).queuedMessages?.[0];
  if (!queued) throw new Error('Missing queue item');
  expect(queued.text).toBe('Please @Goal also inspect @src');
  await chat.steerQueuedMessage(queued.id, webContents);
  expect(session.steerQueue).toEqual(['Please @Goal also inspect @src']);
  await chat.abort();
  await sending;
  chat.dispose();
});

it('updates only the paused goal in the requested active session', async () => {
  const { chat, tab, session, webContents } = await setup();
  const sending = chat.send('@Goal Original objective', webContents);
  await session.awaitPromptCall();
  expect((await chat.updateGoal(tab.id, 'too soon')).ready).toBe(false);
  await chat.controlGoal(tab.id, 'pause', webContents);
  await sending;
  expect((await chat.updateGoal('stale-session', 'wrong')).ready).toBe(false);
  expect((await chat.updateGoal(tab.id, ' ')).ready).toBe(false);
  expect((await chat.updateGoal(tab.id, 'Updated objective')).goal).toEqual({
    status: 'paused',
    objective: 'Updated objective',
    iterations: 1,
    elapsedMs: expect.any(Number)
  });
  expect(session.isStreaming).toBe(false);
  await chat.controlGoal(tab.id, 'cancel', webContents);
  expect((await chat.updateGoal(tab.id, 'cancelled')).ready).toBe(false);
  expect((await chat.getStatus()).goal?.objective).toBe('Updated objective');
  chat.dispose();
});

it.each(['missing', 'completed', 'cancelled'] as const)(
  'ignores stale goal controls on a %s goal while an ordinary response runs',
  async (status) => {
    const chat = freshChatService();
    const manager = SessionManager.create(process.cwd());
    if (status !== 'missing') {
      manager.appendCustomEntry('start-goal', { status, objective: 'Previous goal', iterations: 1, elapsedMs: 2000 });
    }
    await chat.openSession(manager.getSessionFile() ?? manager.getSessionId());
    const session = getFakeSession(manager.getSessionId());
    if (!session) throw new Error('Missing restored session');
    const webContents = newWebContents();
    const sending = chat.send('Ordinary message', webContents);
    await session.awaitPromptCall();
    await chat.send('Queued ordinary message', webContents);
    const abort = vi.spyOn(session, 'abort');
    for (const action of ['pause', 'cancel'] as const) {
      await chat.controlGoal(manager.getSessionId(), action, webContents);
      expect(session.isStreaming).toBe(true);
      expect(session.followUpQueue).toEqual(['Queued ordinary message']);
    }
    expect(abort).not.toHaveBeenCalled();
    await chat.abort();
    await sending;
    chat.dispose();
  }
);

it('cancels a paused goal without stopping an ordinary response or clearing its queue', async () => {
  const { chat, tab, session, webContents } = await setup();
  const goalRun = chat.send('@Goal Original objective', webContents);
  await session.awaitPromptCall();
  await chat.controlGoal(tab.id, 'pause', webContents);
  await goalRun;
  const ordinaryRun = chat.send('A separate question', webContents);
  await session.awaitPromptCall();
  await chat.send('Follow up on the question', webContents);
  const abort = vi.spyOn(session, 'abort');
  await chat.controlGoal(tab.id, 'pause', webContents);
  expect((await chat.controlGoal(tab.id, 'cancel', webContents)).goal?.status).toBe('cancelled');
  expect(abort).not.toHaveBeenCalled();
  expect(session.isStreaming).toBe(true);
  expect(session.followUpQueue).toEqual(['Follow up on the question']);
  await chat.abort();
  await ordinaryRun;
  chat.dispose();
});
