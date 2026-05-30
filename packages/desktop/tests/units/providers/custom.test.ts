import { describe, expect, it } from 'vitest';
import { CustomProviderStore, type CustomProviderConfig } from '@main/providers/custom';
import type { SecretCodec } from '@main/providers/codec';
import type { StartDatabase } from '@main/db';

const plaintextCodec: SecretCodec = {
  available: () => true,
  encode: (plain) => Buffer.from(plain, 'utf8'),
  decode: (cipher) => Buffer.from(cipher).toString('utf8')
};

const makeFakeDb = () => {
  const rows = new Map<string, { ciphertext: Uint8Array; updated_at: number }>();
  const prepare = (sql: string) => {
    if (sql.startsWith('SELECT name, ciphertext FROM custom_models')) {
      return {
        all: () =>
          [...rows.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([name, row]) => ({ name, ciphertext: row.ciphertext }))
      };
    }
    if (sql.startsWith('INSERT INTO custom_models')) {
      return {
        run: (name: string, ciphertext: Uint8Array, updated_at: number) => rows.set(name, { ciphertext, updated_at })
      };
    }
    if (sql.startsWith('DELETE FROM custom_models')) {
      return { run: (name: string) => rows.delete(name) };
    }
    throw new Error(`Unexpected SQL: ${sql}`);
  };
  return { prepare } as unknown as StartDatabase;
};

const baseConfig = (overrides: Partial<CustomProviderConfig> = {}): CustomProviderConfig => ({
  name: 'ollama',
  baseUrl: 'http://localhost:11434/v1',
  apiKey: 'any',
  models: [{ id: 'llama3.1:8b' }],
  ...overrides
});

describe('CustomProviderStore', () => {
  it('persists and lists a saved provider', () => {
    const store = new CustomProviderStore(makeFakeDb(), plaintextCodec);
    const saved = store.save(baseConfig());
    expect(saved.name).toBe('ollama');
    expect(store.list()).toEqual([
      { name: 'ollama', baseUrl: 'http://localhost:11434/v1', apiKey: 'any', models: [{ id: 'llama3.1:8b' }] }
    ]);
  });

  it('trims whitespace on save and rejects empty fields', () => {
    const store = new CustomProviderStore(makeFakeDb(), plaintextCodec);
    const saved = store.save({
      name: '  ollama  ',
      baseUrl: ' http://localhost:11434/v1 ',
      apiKey: 'any',
      models: [{ id: ' llama3.1:8b ', name: ' Llama ' }]
    });
    expect(saved.name).toBe('ollama');
    expect(saved.baseUrl).toBe('http://localhost:11434/v1');
    expect(saved.models).toEqual([{ id: 'llama3.1:8b', name: 'Llama' }]);
  });

  it('throws when a required field is missing', () => {
    const store = new CustomProviderStore(makeFakeDb(), plaintextCodec);
    expect(() => store.save(baseConfig({ name: '   ' }))).toThrow(/required/);
    expect(() => store.save(baseConfig({ baseUrl: '' }))).toThrow(/required/);
    expect(() => store.save(baseConfig({ apiKey: '' }))).toThrow(/required/);
    expect(() => store.save(baseConfig({ models: [] }))).toThrow(/required/);
  });

  it('rejects a name that collides with a built-in provider, case-insensitively', () => {
    const store = new CustomProviderStore(makeFakeDb(), plaintextCodec);
    expect(() => store.save(baseConfig({ name: 'openai' }))).toThrow(/reserved/);
    expect(() => store.save(baseConfig({ name: ' Anthropic ' }))).toThrow(/reserved/);
    expect(() => store.save(baseConfig({ name: 'GOOGLE' }))).toThrow(/reserved/);
    expect(store.list()).toEqual([]);
  });

  it('persists thinking labels, dropping blanks', () => {
    const store = new CustomProviderStore(makeFakeDb(), plaintextCodec);
    const saved = store.save(baseConfig({ thinkingLabels: ['minimal', '  ', 'high'] }));
    expect(saved.thinkingLabels).toEqual(['minimal', 'high']);
  });

  it('rejects more thinking labels than the supported maximum', () => {
    const store = new CustomProviderStore(makeFakeDb(), plaintextCodec);
    const labels = ['minimal', 'low', 'medium', 'high', 'max'];
    expect(() => store.save(baseConfig({ thinkingLabels: labels }))).toThrow(/at most/);
  });

  it('omits thinking labels when none are provided', () => {
    const store = new CustomProviderStore(makeFakeDb(), plaintextCodec);
    const saved = store.save(baseConfig());
    expect(saved.thinkingLabels).toBeUndefined();
  });

  it('omits absent optional model name instead of writing undefined', () => {
    const store = new CustomProviderStore(makeFakeDb(), plaintextCodec);
    store.save(baseConfig({ models: [{ id: 'llama3.1:8b' }] }));
    expect(store.list()[0]?.models[0]).toEqual({ id: 'llama3.1:8b' });
  });

  it('removes a saved provider', () => {
    const store = new CustomProviderStore(makeFakeDb(), plaintextCodec);
    store.save(baseConfig());
    store.remove('ollama');
    expect(store.list()).toEqual([]);
  });

  it('returns an empty list when the codec is unavailable', () => {
    const codec: SecretCodec = { ...plaintextCodec, available: () => false };
    const store = new CustomProviderStore(makeFakeDb(), codec);
    expect(store.list()).toEqual([]);
  });

  it('throws when saving while codec is unavailable', () => {
    const codec: SecretCodec = { ...plaintextCodec, available: () => false };
    const store = new CustomProviderStore(makeFakeDb(), codec);
    expect(() => store.save(baseConfig())).toThrow(/not available/);
  });
});
