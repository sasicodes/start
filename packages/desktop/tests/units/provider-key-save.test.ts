import type { ProviderAuthStatus } from '@preload/index';
import { saveProviderKey } from '@renderer/shared/settings/utils/api-key';
import { afterEach, expect, it, vi } from 'vitest';
import { deferred } from '../helpers/deferred.js';

afterEach(() => vi.unstubAllGlobals());

it('reports a rejected credential save as a failure and permits a successful retry', async () => {
  const providers: ProviderAuthStatus[] = [];
  const setApiKey = vi.fn().mockRejectedValueOnce(new Error('Storage unavailable')).mockResolvedValueOnce(providers);
  vi.stubGlobal('window', { pi: { chat: { setApiKey } } });

  expect(await saveProviderKey('exa', 'draft-key')).toBeNull();
  expect(await saveProviderKey('exa', 'draft-key')).toBe(providers);
  expect(setApiKey).toHaveBeenNthCalledWith(1, 'exa', 'draft-key');
  expect(setApiKey).toHaveBeenNthCalledWith(2, 'exa', 'draft-key');
});

it('waits for credential persistence before reporting success', async () => {
  const result = deferred<ProviderAuthStatus[]>();
  const setApiKey = vi.fn(() => result.promise);
  vi.stubGlobal('window', { pi: { chat: { setApiKey } } });
  const completed = vi.fn();
  const saving = saveProviderKey('exa', 'draft-key').then(completed);
  await Promise.resolve();
  expect(completed).not.toHaveBeenCalled();
  result.resolve([]);
  await saving;
  expect(completed).toHaveBeenCalledWith([]);
});
