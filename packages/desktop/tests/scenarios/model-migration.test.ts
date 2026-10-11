import * as tools from '@main/providers/tools/index';
import * as sessions from '@main/sessions';
import { replacementModelKey } from '@main/utils/model-key';
import { expect, it, vi } from 'vitest';
import { fakeModelDefaults, getFakeSession, SessionManager } from '../fakes/agent/index.js';
import { getStorageSnapshot } from '../fakes/storage.js';
import { freshChatService } from '../helpers/chat-service.js';

const migrations = [
  ['openai', 'gpt-5.6-sol', 'gpt-6.1-sol'],
  ['openai', 'gpt-5.6-luna', 'gpt-6-luna'],
  ['openai', 'gpt-5.6-terra', 'gpt-6.1-sol'],
  ['openai-codex', 'gpt-5.6-sol', 'gpt-6.1-sol'],
  ['openai-codex', 'gpt-5.6-luna', 'gpt-6-luna'],
  ['openai-codex', 'gpt-5.6-terra', 'gpt-6.1-sol'],
  ['anthropic', 'claude-sonnet-5', 'claude-sonnet-5-5']
] as const;

it.each(migrations)('maps %s:%s to %s without changing the provider', (provider, previous, next) => {
  expect(replacementModelKey(`${provider}:${previous}`)).toBe(`${provider}:${next}`);
  expect(replacementModelKey(`${provider}:${next}`)).toBe(`${provider}:${next}`);
});

it.each(['', 'unknown:model', 'openrouter:gpt-5.6-luna', 'anthropic:gpt-5.6-sol'])(
  'preserves an unrelated model key %s',
  (key) => {
    expect(replacementModelKey(key)).toBe(key);
  }
);

it.each(migrations)('restores the saved %s:%s selection as %s', async (provider, previous, next) => {
  const chat = freshChatService({
    lastWorkspace: '/tmp/workspace-a',
    selectedModelKey: `${provider}:${previous}`,
    models: [provider === 'anthropic' ? 'claude-fable-5-1' : 'gpt-6-astra', next].map((id) => ({
      ...fakeModelDefaults,
      id,
      name: id,
      provider,
      reasoning: true,
      contextWindow: 200000,
      input: ['text']
    }))
  });
  const catalog = await chat.getModels();
  const tab = await chat.createTab('/tmp/workspace-a');

  expect(catalog.selectedModelKey).toBe(`${provider}:${next}`);
  expect(getStorageSnapshot().selectedModelKey).toBe(`${provider}:${next}`);
  expect(getFakeSession(tab.id)?.model.id).toBe(next);
  chat.dispose();
});

it.each(migrations)('restores a workspace default of %s:%s as %s', async (provider, previous, next) => {
  const chat = freshChatService({
    lastWorkspace: '/tmp/workspace-a',
    workspaceModelDefaults: {
      '/tmp/workspace-b': { modelKey: `${provider}:${previous}`, thinkingLevel: 'high' }
    },
    selectedModelKey: `${provider}:${provider === 'anthropic' ? 'claude-fable-5-1' : 'gpt-6-astra'}`,
    models: [provider === 'anthropic' ? 'claude-fable-5-1' : 'gpt-6-astra', next].map((id) => ({
      ...fakeModelDefaults,
      id,
      name: id,
      provider,
      reasoning: true,
      contextWindow: 200000,
      input: ['text']
    }))
  });
  const result = await chat.switchWorkspace('/tmp/workspace-b');
  const tab = await chat.createTab('/tmp/workspace-b');

  expect(result.status?.selectedModelKey).toBe(`${provider}:${next}`);
  expect(result.status?.thinkingLevel).toBe('high');
  expect(getFakeSession(tab.id)?.model.id).toBe(next);
  chat.dispose();
});

it.each(migrations)('restores an old session using %s:%s as %s', async (provider, previous, next) => {
  const chat = freshChatService({
    lastWorkspace: '/tmp/workspace-a',
    models: [provider === 'anthropic' ? 'claude-fable-5-1' : 'gpt-6-astra', next].map((id) => ({
      ...fakeModelDefaults,
      id,
      name: id,
      provider,
      reasoning: true,
      contextWindow: 200000,
      input: ['text']
    }))
  });
  const manager = SessionManager.create('/tmp/workspace-a');
  const id = manager.getSessionId();
  vi.spyOn(sessions, 'getSession').mockReturnValue({
    id,
    path: id,
    title: 'old session',
    archived: false,
    createdAt: 1,
    updatedAt: 1,
    modelId: previous,
    modelProvider: provider,
    thinkingLevel: 'high',
    totalInputTokens: 0,
    totalOutputTokens: 0,
    cwd: '/tmp/workspace-a'
  });
  const result = await chat.openSession(id);

  expect(result.ok).toBe(true);
  expect(result.status?.selectedModelKey).toBe(`${provider}:${next}`);
  expect(result.status?.thinkingLevel).toBe('high');
  expect(getFakeSession(id)?.model.id).toBe(next);
  chat.dispose();
});

it('keeps the normal fallback when a replacement is unavailable', async () => {
  const chat = freshChatService({ selectedModelKey: 'anthropic:claude-sonnet-5' });
  expect((await chat.getModels()).selectedModelKey).toBe('anthropic:claude-opus-5-5');
  chat.dispose();
});

it.each(migrations)('resolves a subagent pick of %s:%s as %s', async (provider, previous, next) => {
  const createTools = vi.spyOn(tools, 'createStartCustomTools');
  const chat = freshChatService({
    models: [provider === 'anthropic' ? 'claude-fable-5-1' : 'gpt-6-astra', next].map((id) => ({
      ...fakeModelDefaults,
      id,
      name: id,
      provider,
      reasoning: true,
      contextWindow: 200000,
      input: ['text']
    }))
  });
  await chat.createTab('/tmp/workspace-a');

  const options = createTools.mock.calls[0]?.[0];
  expect(options?.resolveModel(`${provider}:${previous}`)?.id).toBe(next);
  chat.dispose();
});
