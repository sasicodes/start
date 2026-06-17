import { describe, expect, it } from 'vitest';
import type { FakeModel } from '../fakes/agent/index.js';
import { getFakeSession } from '../fakes/agent/index.js';
import { getStorageSnapshot } from '../fakes/storage.js';
import { freshChatService, newWebContents } from '../helpers/chat-service.js';

const twoAnthropicModels: FakeModel[] = [
  {
    reasoning: true,
    input: ['text'],
    contextWindow: 200000,
    id: 'claude-opus-4-7',
    name: 'Claude Opus 4 7',
    provider: 'anthropic'
  },
  {
    reasoning: true,
    input: ['text'],
    contextWindow: 200000,
    id: 'claude-sonnet-4-6',
    name: 'Claude Sonnet 4 6',
    provider: 'anthropic'
  }
];

describe('model and thinking level', () => {
  it('keeps the active session when the model changes', async () => {
    const chat = freshChatService({
      lastWorkspace: '/tmp/workspace-a',
      models: twoAnthropicModels,
      selectedModelKey: 'anthropic:claude-opus-4-7'
    });
    const webContents = newWebContents();

    const tab = await chat.createTab('/tmp/workspace-a');
    const sendPromise = chat.send('hello', webContents);
    const session = getFakeSession(tab.id);
    await session?.awaitPromptCall();
    session?.finishPrompt();
    await sendPromise;

    const swap = await chat.selectModel('anthropic:claude-sonnet-4-6');
    expect(swap.ready).toBe(true);
    expect(swap.selectedModelKey).toBe('anthropic:claude-sonnet-4-6');
    expect(getStorageSnapshot().selectedModelKey).toBe('anthropic:claude-sonnet-4-6');
    expect(session?.model.id).toBe('claude-sonnet-4-6');
    expect(session?.sessionManager.getEntries()).toContainEqual(
      expect.objectContaining({
        type: 'model_change',
        provider: 'anthropic',
        modelId: 'claude-sonnet-4-6'
      })
    );

    const status = await chat.getStatus();
    expect(status.sessionId).toBe(tab.id);
    const tabs = chat.getTabs();
    expect(tabs.some((entry) => entry.id === tab.id)).toBe(true);
  });

  it('refuses to swap models while a response is streaming', async () => {
    const chat = freshChatService({ lastWorkspace: '/tmp/workspace-a', models: twoAnthropicModels });
    const webContents = newWebContents();

    const tab = await chat.createTab('/tmp/workspace-a');
    const sendPromise = chat.send('long', webContents);
    const session = getFakeSession(tab.id);
    await session?.awaitPromptCall();

    const blocked = await chat.selectModel('anthropic:claude-sonnet-4-6');
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
          reasoning: true,
          input: ['text'],
          contextWindow: 200000,
          id: 'gpt-5.5',
          name: 'GPT 5.5',
          provider: 'openai'
        }
      ]
    });

    const state = await chat.getMobileModelsState();
    expect(state.models).toEqual([
      {
        key: 'openai:gpt-5.5',
        name: 'GPT 5.5',
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
