import type { ModelRegistry } from '@earendil-works/pi-coding-agent';
import type { StartDatabase } from '@main/db';
import { resolveSecretCodec, type SecretCodec } from '@main/providers/codec';
import { readRequiredBytes, type SqliteRow } from '@main/sqlite-row';
import { effortLevels, type EffortLevel } from '@main/types';

const customApi = 'openai-completions' as const;
const defaultContextWindow = 128000;
const defaultMaxTokens = 32000;
const defaultCost = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };

const maxThinkingLabels = effortLevels.length;

const sanitizeThinkingLabels = (raw: readonly string[] | undefined): string[] => {
  if (!raw) return [];
  const cleaned: string[] = [];
  for (const value of raw) {
    const trimmed = value.trim();
    if (trimmed.length > 0) cleaned.push(trimmed);
  }
  return cleaned.slice(0, maxThinkingLabels);
};

const buildThinkingLevelMap = (labels: readonly string[]) => {
  const map: Record<'off' | EffortLevel, string | null> = {
    off: null,
    low: null,
    high: null,
    xhigh: null,
    medium: null
  };
  for (let index = 0; index < labels.length && index < effortLevels.length; index++) {
    const slot = effortLevels[index];
    const label = labels[index];
    if (slot && label) map[slot] = label;
  }
  return map;
};

export interface CustomProviderModel {
  id: string;
  name?: string;
}

export interface CustomProviderConfig {
  name: string;
  baseUrl: string;
  apiKey: string;
  models: CustomProviderModel[];
  thinkingLabels?: string[];
}

const normalizeName = (value: string) => value.trim();

const sanitizeConfig = (config: CustomProviderConfig): CustomProviderConfig => {
  const thinkingLabels = sanitizeThinkingLabels(config.thinkingLabels);
  return {
    name: normalizeName(config.name),
    baseUrl: config.baseUrl.trim(),
    apiKey: config.apiKey,
    models: config.models
      .map((model) => ({ id: model.id.trim(), ...(model.name ? { name: model.name.trim() } : {}) }))
      .filter((model) => model.id.length > 0),
    ...(thinkingLabels.length > 0 ? { thinkingLabels } : {})
  };
};

const isValidConfig = (config: CustomProviderConfig) =>
  config.name.length > 0 && config.baseUrl.length > 0 && config.apiKey.length > 0 && config.models.length > 0;

export class CustomProviderStore {
  private readonly codec: SecretCodec;
  private readonly listStmt;
  private readonly writeStmt;
  private readonly deleteStmt;

  constructor(db: StartDatabase, codec: SecretCodec) {
    this.codec = codec;
    this.listStmt = db.prepare('SELECT name, ciphertext FROM custom_models ORDER BY name ASC');
    this.writeStmt = db.prepare(
      'INSERT INTO custom_models (name, ciphertext, updated_at) VALUES (?, ?, ?) ON CONFLICT(name) DO UPDATE SET ciphertext = excluded.ciphertext, updated_at = excluded.updated_at'
    );
    this.deleteStmt = db.prepare('DELETE FROM custom_models WHERE name = ?');
  }

  list(): CustomProviderConfig[] {
    if (!this.codec.available()) return [];
    const rows = this.listStmt.all() as SqliteRow[];
    const entries: CustomProviderConfig[] = [];
    for (const row of rows) {
      const parsed = this.decodeRow(row);
      if (parsed) entries.push(parsed);
    }
    return entries;
  }

  save(config: CustomProviderConfig): CustomProviderConfig {
    if (!this.codec.available()) {
      throw new Error('Secure storage is not available; cannot save custom providers.');
    }
    const sanitized = sanitizeConfig(config);
    if (!isValidConfig(sanitized)) {
      throw new Error('Custom provider requires a name, base URL, API key, and at least one model.');
    }
    const payload = this.codec.encode(JSON.stringify(sanitized));
    this.writeStmt.run(sanitized.name, payload, Date.now());
    return sanitized;
  }

  remove(name: string) {
    const normalized = normalizeName(name);
    if (!normalized) return;
    this.deleteStmt.run(normalized);
  }

  private decodeRow(row: SqliteRow): CustomProviderConfig | null {
    try {
      const ciphertext = readRequiredBytes(row, 'ciphertext');
      const parsed = JSON.parse(this.codec.decode(ciphertext)) as unknown;
      if (typeof parsed !== 'object' || parsed === null) return null;
      const candidate = parsed as Partial<CustomProviderConfig>;
      if (typeof candidate.name !== 'string' || typeof candidate.baseUrl !== 'string') return null;
      if (typeof candidate.apiKey !== 'string' || !Array.isArray(candidate.models)) return null;
      return candidate as CustomProviderConfig;
    } catch {
      return null;
    }
  }
}

const toProviderConfig = (config: CustomProviderConfig) => {
  const thinkingLabels = config.thinkingLabels ?? [];
  const reasoning = thinkingLabels.length > 0;
  return {
    api: customApi,
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
    models: config.models.map((model) => ({
      id: model.id,
      name: model.name ?? model.id,
      cost: defaultCost,
      input: ['text' as const],
      reasoning,
      maxTokens: defaultMaxTokens,
      contextWindow: defaultContextWindow,
      ...(reasoning ? { thinkingLevelMap: buildThinkingLevelMap(thinkingLabels) } : {})
    }))
  };
};

export const createCustomProviderStore = (db: StartDatabase) => new CustomProviderStore(db, resolveSecretCodec());

export const registerCustomProvider = (modelRegistry: ModelRegistry, config: CustomProviderConfig) => {
  modelRegistry.registerProvider(config.name, toProviderConfig(config));
};

export const unregisterCustomProvider = (modelRegistry: ModelRegistry, name: string) => {
  modelRegistry.unregisterProvider(normalizeName(name));
};

export const registerAllCustomProviders = (modelRegistry: ModelRegistry, store: CustomProviderStore) => {
  for (const config of store.list()) registerCustomProvider(modelRegistry, config);
};
