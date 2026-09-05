import type { StartDatabase } from '@main/db';
import { DbCredentialStore } from '@main/providers/auth';
import type { SecretCodec } from '@main/providers/codec';
import { describe, expect, it, vi } from 'vitest';

const codec: SecretCodec = {
  available: () => true,
  decode: (cipher) => Buffer.from(cipher).reverse().toString('utf8'),
  encode: (plain) => Buffer.from(plain, 'utf8').reverse()
};

const createStore = (secretCodec: SecretCodec = codec) => {
  let ciphertext: Buffer | null = null;
  const writes: string[] = [];
  const db = {
    prepare: (sql: string) => {
      if (sql.startsWith('SELECT')) {
        return { get: () => (ciphertext ? { ciphertext } : null) };
      }
      return {
        run: (provider: string, next: Buffer) => {
          writes.push(provider);
          ciphertext = Buffer.from(next);
        }
      };
    }
  } as unknown as StartDatabase;

  return {
    writes,
    store: new DbCredentialStore(db, secretCodec),
    plaintext: () => (ciphertext ? secretCodec.decode(ciphertext) : '')
  };
};

describe('credential store', () => {
  it('does not access protected storage until credentials are saved', async () => {
    const available = vi.fn(codec.available);
    const decode = vi.fn(codec.decode);
    const encode = vi.fn(codec.encode);
    const { store } = createStore({ available, decode, encode });

    store.reload();
    await expect(store.list()).resolves.toEqual([]);
    expect(available).not.toHaveBeenCalled();
    expect(decode).not.toHaveBeenCalled();
    expect(encode).not.toHaveBeenCalled();

    await store.modify('anthropic', async () => ({ type: 'api_key', key: 'secret-key' }));
    expect(available).toHaveBeenCalledOnce();
    expect(encode).toHaveBeenCalledOnce();
    store.reload();
    expect(decode).toHaveBeenCalledOnce();
    await expect(store.read('anthropic')).resolves.toEqual({ type: 'api_key', key: 'secret-key' });
  });

  it('persists all credentials in one encrypted database blob', async () => {
    const { plaintext, store, writes } = createStore();
    await store.modify('anthropic', async () => ({ type: 'api_key', key: 'secret-key' }));
    await store.modify('openai-codex', async () => ({
      type: 'oauth',
      access: 'access-token',
      refresh: 'refresh-token',
      expires: 123,
      accountId: 'account-1'
    }));

    expect(writes).toEqual(['__all__', '__all__']);
    expect(JSON.parse(plaintext())).toEqual({
      anthropic: { type: 'api_key', key: 'secret-key' },
      'openai-codex': {
        type: 'oauth',
        access: 'access-token',
        refresh: 'refresh-token',
        expires: 123,
        accountId: 'account-1'
      }
    });
    await expect(store.list()).resolves.toEqual([
      { providerId: 'anthropic', type: 'api_key' },
      { providerId: 'openai-codex', type: 'oauth' }
    ]);
  });

  it('serializes modifications and deletes credentials', async () => {
    const { plaintext, store } = createStore();
    await Promise.all([
      store.modify('anthropic', async () => ({ type: 'api_key', key: 'anthropic-key' })),
      store.modify('openai', async () => ({ type: 'api_key', key: 'openai-key' }))
    ]);
    await store.modify('openai', async () => {});
    await store.delete('anthropic');

    await expect(store.read('anthropic')).resolves.toBeUndefined();
    await expect(store.read('openai')).resolves.toEqual({ type: 'api_key', key: 'openai-key' });
    expect(JSON.parse(plaintext())).toEqual({ openai: { type: 'api_key', key: 'openai-key' } });
  });
});
