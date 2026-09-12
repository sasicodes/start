import * as goals from '@main/goal/controller';
import { historyTurns } from '@main/history';
import { afterEach, expect, it, vi } from 'vitest';
import { getFakeSession } from '../fakes/agent/index.js';
import { freshChatService, newWebContents } from '../helpers/chat-service.js';
import { deferred } from '../helpers/deferred.js';

const services: ReturnType<typeof freshChatService>[] = [];

afterEach(async () => {
  for (const chat of services.splice(0)) {
    await chat.abort();
    chat.dispose();
  }
});

const setup = async () => {
  const created = vi.spyOn(goals, 'createGoalController');
  const chat = freshChatService();
  services.push(chat);
  const tab = await chat.createTab();
  const session = getFakeSession(tab.id);
  const result = created.mock.results.at(-1);
  if (!session || result?.type !== 'return') throw new Error('Missing session or goal controller');
  const goal = result.value;
  const webContents = newWebContents();
  const queued = async () => (await chat.openSessionId(tab.id)).queuedMessages ?? [];
  return { chat, tab, goal, queued, session, webContents };
};

it('queues a goal during ordinary work and activates it only after the response settles', async () => {
  const { chat, goal, queued, session, webContents } = await setup();
  const sending = chat.send('Answer a question', webContents);
  await session.awaitPromptCall();
  expect(await chat.send('@Goal Next objective', webContents)).toMatchObject({ ok: true, queued: true });
  expect(goal.get()).toBeNull();
  expect(await queued()).toMatchObject([{ kind: 'goal', text: '@Goal Next objective' }]);
  expect(session.followUpQueue).toEqual([]);

  session.finishPrompt();
  await session.awaitPromptCall();
  expect(goal.get()).toMatchObject({ status: 'active', objective: 'Next objective', iterations: 1 });
  expect(await queued()).toEqual([]);
  goal.finish('completed', 'Verified the outcome');
  session.finishPrompt();
  expect(await sending).toMatchObject({ ok: true });
});

it('advances through queued goals in order only after each goal completes', async () => {
  const { chat, goal, queued, session, webContents } = await setup();
  const sending = chat.send('@Goal First', webContents);
  await session.awaitPromptCall();
  await chat.send('@Goal Second', webContents);
  await chat.send('@Goal Third', webContents);
  session.finishPrompt();
  await session.awaitPromptCall();
  expect(goal.get()?.objective).toBe('First');
  expect(await queued()).toHaveLength(2);

  for (const objective of ['Second', 'Third']) {
    goal.finish('completed', 'Verified the outcome');
    session.finishPrompt();
    await session.awaitPromptCall();
    expect(goal.get()).toMatchObject({ objective, status: 'active', iterations: 1 });
  }
  goal.finish('completed', 'Verified the outcome');
  session.finishPrompt();
  await sending;
  expect(await queued()).toEqual([]);
});

it('holds later goals while paused, including manual send, and advances after cancellation', async () => {
  const { chat, tab, goal, queued, session, webContents } = await setup();
  const sending = chat.send('@Goal First', webContents);
  await session.awaitPromptCall();
  await chat.send('@Goal Second', webContents);
  await chat.controlGoal(tab.id, 'pause', webContents);
  await sending;
  const [next] = await queued();
  if (!next) throw new Error('Missing queued goal');
  await chat.sendQueuedMessage(next.id, webContents);
  expect(session.isStreaming).toBe(false);
  expect(goal.get()).toMatchObject({ status: 'paused', objective: 'First' });
  await chat.controlGoal(tab.id, 'cancel', webContents);
  await session.awaitPromptCall();
  expect(goal.get()).toMatchObject({ status: 'active', objective: 'Second' });
});

it('starts the next queued goal after cancelling an active goal', async () => {
  const { chat, tab, goal, session, webContents } = await setup();
  const sending = chat.send('@Goal First', webContents);
  await session.awaitPromptCall();
  await chat.send('@Goal Second', webContents);
  await chat.controlGoal(tab.id, 'cancel', webContents);
  await sending;
  await session.awaitPromptCall();
  expect(goal.get()).toMatchObject({ status: 'active', objective: 'Second' });
  expect(
    session.sessionManager.getEntries().filter((entry) => JSON.stringify(entry).includes('@Goal Second'))
  ).toHaveLength(1);
});

it('allows ordinary follow-ups and steering while queued goals stay held', async () => {
  const { chat, queued, session, webContents } = await setup();
  chat.send('@Goal First', webContents);
  await session.awaitPromptCall();
  await chat.send('@Goal Second', webContents);
  await chat.send('Use the existing helper', webContents);
  const messages = await queued();
  const instruction = messages.find((message) => message.kind === 'followUp');
  const next = messages.find((message) => message.kind === 'goal');
  if (!instruction || !next) throw new Error('Missing queued work');
  await chat.steerQueuedMessage(instruction.id, webContents);
  await chat.steerQueuedMessage(next.id, webContents);
  expect(session.steerQueue).toEqual(['Use the existing helper']);
  expect(session.followUpQueue).toEqual([]);
  expect(await queued()).toMatchObject([{ kind: 'goal' }, { kind: 'steer' }]);
});

it('preserves goal identity through editing, reordering, deletion and a session switch', async () => {
  const { chat, tab, goal, queued, session, webContents } = await setup();
  chat.send('@Goal First', webContents);
  await session.awaitPromptCall();
  await chat.send('@Goal Second', webContents);
  await chat.send('@Goal Third', webContents);
  const [second, third] = await queued();
  if (!second || !third) throw new Error('Missing queued goals');
  await chat.setQueuedMessageEditing(third.id, true, webContents);
  expect(await chat.editQueuedMessage(third.id, '@Goal', webContents)).toBe(false);
  expect(await chat.editQueuedMessage(third.id, 'Edited third', webContents)).toBe(true);
  await chat.reorderQueuedMessages([third.id, second.id], webContents);
  await chat.deleteQueuedMessage(second.id, webContents);
  await chat.newSession();
  expect((await chat.openSessionId(tab.id)).queuedMessages).toMatchObject([
    { id: third.id, kind: 'goal', text: '@Goal Edited third' }
  ]);
  goal.finish('completed', 'Verified the outcome');
  session.finishPrompt();
  await session.awaitPromptCall();
  expect(goal.get()?.objective).toBe('Edited third');
});

it('retains queued goals when the model fails and rejects invalid goals without stopping current work', async () => {
  const { chat, goal, queued, session, webContents } = await setup();
  const sending = chat.send('@Goal First', webContents);
  await session.awaitPromptCall();
  expect(await chat.send('@Goal', webContents)).toMatchObject({ ok: false });
  expect(await chat.send(`@Goal ${'x'.repeat(8001)}`, webContents)).toMatchObject({ ok: false });
  expect(goal.get()?.status).toBe('active');
  expect(session.isStreaming).toBe(true);
  await chat.send('@Goal Second', webContents);
  session.failPrompt('Provider unavailable');
  await sending;
  expect(goal.get()?.status).toBe('paused');
  expect(await queued()).toMatchObject([{ kind: 'goal', text: '@Goal Second' }]);
});

it('keeps continuation and resume hidden in restored history without hiding matching user text', async () => {
  const { chat, tab, session, webContents } = await setup();
  const sending = chat.send('@Goal First', webContents);
  await session.awaitPromptCall();
  session.finishPrompt();
  await session.awaitPromptCall();
  await chat.controlGoal(tab.id, 'pause', webContents);
  await sending;
  await chat.updateGoal(tab.id, 'Edited objective');
  await chat.controlGoal(tab.id, 'resume', webContents);
  await session.awaitPromptCall();
  const entries = session.sessionManager.getEntries();
  expect(entries.filter((entry) => JSON.stringify(entry).includes('start-goal-continuation'))).toHaveLength(2);
  expect(
    historyTurns(entries)
      .filter((turn) => turn.role === 'user')
      .map((turn) => turn.text)
  ).toEqual(['@Goal First']);
  expect(
    ((await chat.openSessionId(tab.id)).turns ?? []).filter((turn) => turn.role === 'user').map((turn) => turn.text)
  ).toEqual(['@Goal First']);
  await chat.abort();
  const text = 'Continue toward the active goal.';
  const ordinary = chat.send(text, webContents);
  await session.awaitPromptCall();
  session.finishPrompt();
  await ordinary;
  expect(
    historyTurns(session.sessionManager.getEntries())
      .filter((turn) => turn.role === 'user')
      .map((turn) => turn.text)
  ).toEqual(['@Goal First', text]);
});

it('keeps earlier queued goals ahead of a new goal after stopping ordinary work', async () => {
  const { chat, goal, queued, session, webContents } = await setup();
  const sending = chat.send('Ordinary work', webContents);
  await session.awaitPromptCall();
  await chat.send('@Goal First queued', webContents);
  await chat.abort();
  await sending;
  expect(await chat.send('@Goal Second queued', webContents)).toMatchObject({ ok: true, queued: true });
  await session.awaitPromptCall();
  expect(goal.get()?.objective).toBe('First queued');
  expect(await queued()).toMatchObject([{ text: '@Goal Second queued', kind: 'goal' }]);
});

it('starts a queued goal after a running command settles', async () => {
  const { chat, goal, session, webContents } = await setup();
  const gate = deferred<{ output: string; exitCode: number }>();
  const started = deferred<void>();
  vi.spyOn(session, 'executeBash').mockImplementation(async () => {
    started.resolve();
    return gate.promise;
  });
  const command = chat.command('echo done', false, webContents);
  await started.promise;
  expect(await chat.send('@Goal After command', webContents)).toMatchObject({ ok: true, queued: true });
  expect(goal.get()).toBeNull();
  gate.resolve({ output: 'done', exitCode: 0 });
  await command;
  await session.awaitPromptCall();
  expect(goal.get()).toMatchObject({ objective: 'After command', status: 'active' });
});

it('does not skip a queued goal being edited or start queued work after stop', async () => {
  const { chat, goal, queued, session, webContents } = await setup();
  const sending = chat.send('Ordinary work', webContents);
  await session.awaitPromptCall();
  await chat.send('@Goal First queued', webContents);
  const [first] = await queued();
  if (!first) throw new Error('Missing queued goal');
  await chat.setQueuedMessageEditing(first.id, true, webContents);
  await chat.send('@Goal Second queued', webContents);
  session.finishPrompt();
  await sending;
  expect(goal.get()).toBeNull();
  expect(await queued()).toHaveLength(2);
  expect(session.isStreaming).toBe(false);
});
