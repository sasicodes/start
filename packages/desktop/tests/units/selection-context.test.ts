import { expect, it, vi } from 'vitest';
import { FakeModelRegistry, fakeModelDefaults, getFakeSession } from '../fakes/agent/index.js';
import { getStorageSnapshot } from '../fakes/storage.js';
import { freshChatService, newWebContents } from '../helpers/chat-service.js';
import { deferred } from '../helpers/deferred.js';

const setup = () =>
  freshChatService({
    lastWorkspace: '/tmp/selection-context',
    selectedModelKey: 'anthropic:claude-opus-5',
    models: ['claude-opus-5', 'claude-sonnet-5'].map((id) => ({
      ...fakeModelDefaults,
      id,
      name: id,
      provider: 'anthropic',
      reasoning: true,
      input: ['text'],
      contextWindow: 200000
    }))
  });

it.each(['model', 'thinking'])('rejects %s selection after the chat changes during auth refresh', async (kind) => {
  const chat = setup();
  await chat.getStatus();
  const started = deferred<null>();
  const gate = deferred<null>();
  vi.spyOn(FakeModelRegistry.prototype, 'refresh').mockImplementationOnce(async () => {
    started.resolve(null);
    await gate.promise;
  });
  const selection = kind === 'model' ? chat.selectModel('anthropic:claude-sonnet-5') : chat.selectThinkingLevel('high');
  await started.promise;
  await chat.newSession();
  gate.resolve(null);
  expect(await selection).toMatchObject({ ready: false });
  expect(getStorageSnapshot()).toMatchObject({
    selectedThinkingLevel: 'medium',
    selectedModelKey: 'anthropic:claude-opus-5'
  });
  chat.dispose();
});

it('does not overwrite a new chat selection when an older session model save finishes', async () => {
  const chat = setup();
  const tab = await chat.createTab();
  const sending = chat.send('hello', newWebContents());
  const session = getFakeSession(tab.id);
  if (!session) throw new Error('Missing test session');
  await session.awaitPromptCall();
  session.finishPrompt();
  await sending;
  const started = deferred<null>();
  const gate = deferred<null>();
  vi.spyOn(session, 'setModel').mockImplementationOnce(async () => {
    started.resolve(null);
    await gate.promise;
  });
  const selection = chat.selectModel('anthropic:claude-sonnet-5');
  await started.promise;
  await chat.newSession();
  gate.resolve(null);
  expect(await selection).toMatchObject({ ready: false });
  expect(getStorageSnapshot().selectedModelKey).toBe('anthropic:claude-opus-5');
  chat.dispose();
});

it.each(['model', 'thinking'])('rejects %s changes when generation starts during auth refresh', async (kind) => {
  const chat = setup();
  const tab = await chat.createTab();
  const session = getFakeSession(tab.id);
  if (!session) throw new Error('Missing test session');
  const started = deferred<null>();
  const gate = deferred<null>();
  vi.spyOn(FakeModelRegistry.prototype, 'refresh').mockImplementationOnce(async () => {
    started.resolve(null);
    await gate.promise;
  });
  const selection = kind === 'model' ? chat.selectModel('anthropic:claude-sonnet-5') : chat.selectThinkingLevel('high');
  await started.promise;
  session.isStreaming = true;
  gate.resolve(null);
  expect(await selection).toMatchObject({ ready: false });
  expect(getStorageSnapshot()).toMatchObject({
    selectedThinkingLevel: 'medium',
    selectedModelKey: 'anthropic:claude-opus-5'
  });
  session.isStreaming = false;
  chat.dispose();
});
