import { describe, expect, it } from 'vitest';
import { type FakeModel, fakeModelDefaults, getFakeSession } from '../fakes/agent/index.js';
import { getStorageSnapshot } from '../fakes/storage.js';
import { freshChatService, newWebContents } from '../helpers/chat-service.js';

const twoAnthropicModels: FakeModel[] = [
  {
    ...fakeModelDefaults,
    reasoning: true,
    input: ['text'],
    contextWindow: 200000,
    id: 'claude-opus-5',
    name: 'Claude Opus 5',
    provider: 'anthropic'
  },
  {
    ...fakeModelDefaults,
    reasoning: true,
    input: ['text'],
    contextWindow: 200000,
    id: 'claude-sonnet-5',
    name: 'Claude Sonnet 5',
    provider: 'anthropic'
  }
];

describe('model and thinking level', () => {
  it.each([
    ['openai', 'gpt-6-astra', 'GPT-6 Astra'],
    ['openai-codex', 'gpt-6-astra', 'GPT-6 Astra'],
    ['anthropic', 'claude-fable-5-1', 'Claude Fable 5.1']
  ])('selects and persists %s:%s with its reasoning levels', async (provider, id, name) => {
    const key = `${provider}:${id}`;
    const chat = freshChatService({
      lastWorkspace: '/tmp/workspace-a',
      models: [
        ...twoAnthropicModels,
        {
          ...fakeModelDefaults,
          id,
          name,
          provider,
          reasoning: true,
          contextWindow: 272000,
          input: ['text', 'image'],
          thinkingLevelMap: { off: null, xhigh: 'xhigh' }
        }
      ],
      selectedModelKey: 'anthropic:claude-opus-5'
    });
    const tab = await chat.createTab('/tmp/workspace-a');
    const send = chat.send('hello', newWebContents());
    const session = getFakeSession(tab.id);
    await session?.awaitPromptCall();
    session?.finishPrompt();
    await send;

    const status = await chat.selectModel(key);

    expect(status.ready).toBe(true);
    expect((await chat.getStatus()).sessionId).toBe(tab.id);
    expect(status.selectedModelKey).toBe(key);
    expect(getStorageSnapshot().selectedModelKey).toBe(key);
    expect(session?.model.id).toBe(id);
    expect((await chat.getModels()).models.find((model) => model.key === key)?.effortLevels).toEqual([
      'low',
      'medium',
      'high',
      'xhigh'
    ]);
    expect((await chat.selectThinkingLevel('xhigh')).thinkingLevel).toBe('xhigh');
  });

  it('keeps the active session when the model changes', async () => {
    const chat = freshChatService({
      lastWorkspace: '/tmp/workspace-a',
      models: twoAnthropicModels,
      selectedModelKey: 'anthropic:claude-opus-5'
    });
    const webContents = newWebContents();

    const tab = await chat.createTab('/tmp/workspace-a');
    const sendPromise = chat.send('hello', webContents);
    const session = getFakeSession(tab.id);
    await session?.awaitPromptCall();
    session?.finishPrompt();
    await sendPromise;

    const swap = await chat.selectModel('anthropic:claude-sonnet-5');
    expect(swap.ready).toBe(true);
    expect(swap.selectedModelKey).toBe('anthropic:claude-sonnet-5');
    expect(getStorageSnapshot().selectedModelKey).toBe('anthropic:claude-sonnet-5');
    expect(session?.model.id).toBe('claude-sonnet-5');
    expect(session?.sessionManager.getEntries()).toContainEqual(
      expect.objectContaining({
        type: 'model_change',
        provider: 'anthropic',
        modelId: 'claude-sonnet-5'
      })
    );

    const status = await chat.getStatus();
    expect(status.sessionId).toBe(tab.id);
    const tabs = chat.getTabs();
    expect(tabs.some((entry) => entry.id === tab.id)).toBe(true);
  });

  it('remembers a per-workspace default model for new sessions', async () => {
    const chat = freshChatService({
      lastWorkspace: '/tmp/workspace-a',
      models: twoAnthropicModels,
      selectedModelKey: 'anthropic:claude-opus-5'
    });

    const setA = await chat.selectModel('anthropic:claude-sonnet-5');
    expect(setA.selectedModelKey).toBe('anthropic:claude-sonnet-5');
    expect(getStorageSnapshot().workspaceModelDefaults?.['/tmp/workspace-a']?.modelKey).toBe(
      'anthropic:claude-sonnet-5'
    );

    await chat.switchWorkspace('/tmp/workspace-b');
    await chat.selectModel('anthropic:claude-opus-5');
    expect(getStorageSnapshot().workspaceModelDefaults?.['/tmp/workspace-b']?.modelKey).toBe('anthropic:claude-opus-5');

    const backToA = await chat.switchWorkspace('/tmp/workspace-a');
    expect(backToA.status?.selectedModelKey).toBe('anthropic:claude-sonnet-5');
  });

  it('refuses to swap models while a response is streaming', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a', models: twoAnthropicModels });
    const webContents = newWebContents();

    const tab = await chat.createTab('/tmp/workspace-a');
    const sendPromise = chat.send('long', webContents);
    const session = getFakeSession(tab.id);
    await session?.awaitPromptCall();

    const blocked = await chat.selectModel('anthropic:claude-sonnet-5');
    expect(blocked.ready).toBe(false);
    expect(blocked.error).toBe('Stop the current response before changing models.');

    session?.finishPrompt();
    await sendPromise;
  });

  it('persists the thinking level when changed', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });

    const status = await chat.selectThinkingLevel('high');
    expect(status.ready).toBe(true);
    expect(status.thinkingLevel).toBe('high');
    expect(getStorageSnapshot().selectedThinkingLevel).toBe('high');
  });

  it('includes provider identity in mobile model state', async () => {
    const chat = freshChatService({
      models: [
        {
          ...fakeModelDefaults,
          reasoning: true,
          input: ['text'],
          contextWindow: 200000,
          id: 'gpt-5.6-sol',
          name: 'GPT 5.6 Sol',
          provider: 'openai'
        }
      ]
    });

    const state = await chat.getMobileModelsState();
    expect(state.models).toEqual([
      {
        key: 'openai:gpt-5.6-sol',
        name: 'GPT 5.6 Sol',
        provider: 'openai',
        reasoning: true,
        effortLevels: ['low', 'medium', 'high']
      }
    ]);
  });

  it('rejects unknown thinking levels', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a' });
    const status = await chat.selectThinkingLevel('insane');
    expect(status.ready).toBe(false);
    expect(status.error).toBe('Unknown thinking level.');
  });

  it('reports a not-ready status when no models are configured', async () => {
    const chat = freshChatService({
      lastWorkspace: '/tmp/workspace-a',
      models: [],
      modelRegistryError: 'No configured models found.'
    });

    const status = await chat.getStatus();
    expect(status.ready).toBe(false);
    expect(status.error).toBe('No configured models found.');
  });
});
