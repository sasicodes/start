import type { Credential } from '@earendil-works/pi-ai';
import { DbCredentialStore } from '@main/providers/auth';
import { afterEach, expect, it, vi } from 'vitest';
import { freshChatService } from '../helpers/chat-service.js';

afterEach(() => vi.restoreAllMocks());

it('stores and removes the Exa key through the existing credential store without exposing it', async () => {
  const values = new Map<string, Credential>();
  vi.spyOn(DbCredentialStore.prototype, 'read').mockImplementation(async (id) => values.get(id));
  const save = vi.spyOn(DbCredentialStore.prototype, 'modify').mockImplementation(async (id, update) => {
    const value = await update(values.get(id));
    if (value) values.set(id, value);
    return value;
  });
  const remove = vi.spyOn(DbCredentialStore.prototype, 'delete').mockImplementation(async (id) => {
    values.delete(id);
  });
  const chat = freshChatService();
  expect((await chat.getAuthProviders()).find((provider) => provider.key === 'exa')).toMatchObject({
    connected: false,
    hasCredentials: false,
    label: '50 free searches/day'
  });
  const providers = await chat.setApiKey('exa', '  test-exa-secret  ');
  expect(save).toHaveBeenCalledOnce();
  expect(values.get('exa')).toEqual({ type: 'api_key', key: 'test-exa-secret' });
  expect(providers.find((provider) => provider.key === 'exa')).toMatchObject({
    connected: true,
    hasCredentials: true,
    kind: 'api_key',
    label: 'Connected via API key'
  });
  expect(JSON.stringify(providers)).not.toContain('test-exa-secret');
  expect((await chat.getModels()).models.some((model) => model.provider === 'exa')).toBe(false);
  const disconnected = await chat.disconnectProvider('exa');
  expect(remove).toHaveBeenCalledWith('exa');
  expect(disconnected.find((provider) => provider.key === 'exa')).toMatchObject({
    connected: false,
    hasCredentials: false,
    label: '50 free searches/day'
  });
  chat.dispose();
});

it.each(['bad\nheader', 'a'.repeat(4097)])('rejects unsafe Exa header values', async (key) => {
  const chat = freshChatService();
  await expect(chat.setApiKey('exa', key)).rejects.toThrow('Enter a valid Exa API key.');
  chat.dispose();
});
