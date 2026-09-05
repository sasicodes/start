import type { Credential } from '@earendil-works/pi-ai';
import { DbCredentialStore } from '@main/providers/auth';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FakeModelRegistry, FakeModelRuntime, fakeModelDefaults } from '../fakes/agent/index.js';
import { freshChatService, newWebContents } from '../helpers/chat-service.js';
import { deferred } from '../helpers/deferred.js';

afterEach(() => vi.restoreAllMocks());

describe('auth refresh', () => {
  it('shares one credential reload and registry refresh across concurrent UI reads', async () => {
    const chat = freshChatService();
    await chat.getStatus();
    const gate = deferred<null>();
    const started = deferred<null>();
    const reload = vi.spyOn(DbCredentialStore.prototype, 'reload');
    const refresh = vi.spyOn(FakeModelRegistry.prototype, 'refresh').mockImplementation(async () => {
      started.resolve(null);
      await gate.promise;
    });

    const reads = Promise.all([chat.getStatus(), chat.getModels(), chat.getAuthProviders()]);
    await started.promise;
    expect(reload).toHaveBeenCalledOnce();
    expect(refresh).toHaveBeenCalledOnce();
    gate.resolve(null);
    await reads;
    await chat.getModels();
    expect(reload).toHaveBeenCalledTimes(2);
    expect(refresh).toHaveBeenCalledTimes(2);
    chat.dispose();
  });

  it('allows a new refresh after a rejected shared refresh', async () => {
    const chat = freshChatService();
    await chat.getStatus();
    const refresh = vi.spyOn(FakeModelRegistry.prototype, 'refresh').mockRejectedValueOnce(new Error('Refresh failed'));
    await expect(chat.getModels()).rejects.toThrow('Refresh failed');
    await expect(chat.getModels()).resolves.toMatchObject({ models: expect.any(Array) });
    expect(refresh).toHaveBeenCalledTimes(2);
    chat.dispose();
  });

  it.each(['save', 'login', 'logout'] as const)(
    'refreshes availability after %s overlaps an older read',
    async (action) => {
      const chat = freshChatService();
      await chat.getStatus();
      const gate = deferred<null>();
      const started = deferred<null>();
      const mutated = deferred<null>();
      let connected = action === 'logout';
      let available = connected;
      const credential: Credential = { type: 'api_key', key: 'test-key' };
      vi.spyOn(DbCredentialStore.prototype, 'read').mockImplementation(async () => {
        if (connected) return credential;
        return;
      });
      vi.spyOn(FakeModelRegistry.prototype, 'getAvailable').mockImplementation(() =>
        available
          ? [
              {
                ...fakeModelDefaults,
                reasoning: true,
                input: ['text'],
                contextWindow: 200000,
                name: 'Claude Opus 5',
                provider: 'anthropic',
                id: 'claude-opus-5'
              }
            ]
          : []
      );
      const refresh = vi.spyOn(FakeModelRegistry.prototype, 'refresh').mockImplementation(async () => {
        const snapshot = connected;
        started.resolve(null);
        await gate.promise;
        available = snapshot;
      });
      const mutate = () => {
        connected = action !== 'logout';
        mutated.resolve(null);
      };
      vi.spyOn(DbCredentialStore.prototype, 'modify').mockImplementation(async () => {
        mutate();
        return credential;
      });
      vi.spyOn(FakeModelRuntime.prototype, 'login').mockImplementation(async () => mutate());
      vi.spyOn(FakeModelRuntime.prototype, 'logout').mockImplementation(async () => mutate());

      const read = chat.getModels();
      await started.promise;
      const mutation =
        action === 'save'
          ? chat.setApiKey('anthropic', 'test-key')
          : action === 'login'
            ? chat.loginSubscription('anthropic', newWebContents()).then((result) => result.providers)
            : chat.disconnectProvider('anthropic');
      await mutated.promise;
      expect(refresh).toHaveBeenCalledOnce();
      gate.resolve(null);
      const [, providers] = await Promise.all([read, mutation]);

      expect(refresh).toHaveBeenCalledTimes(2);
      expect(providers.find((provider) => provider.key === 'anthropic')?.connected).toBe(action !== 'logout');
      chat.dispose();
    }
  );
});
