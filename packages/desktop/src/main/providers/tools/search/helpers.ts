import type { ModelRegistry } from '@earendil-works/pi-coding-agent';
import type {
  JsonRecord,
  SearchAuth,
  SearchModel,
  SearchSource,
  WebSearchProvider
} from '@main/providers/tools/search/types';

type RegistryWithAuth = ModelRegistry & {
  getApiKey?: (model: SearchModel) => Promise<unknown> | unknown;
  getApiKeyAndHeaders?: (model: SearchModel) => Promise<unknown> | unknown;
};

export const isRecord = (value: unknown): value is JsonRecord => typeof value === 'object' && value !== null;

export const stringValue = (value: unknown) => (typeof value === 'string' && value ? value : '');

const stringRecordValue = (value: unknown): Record<string, string> => {
  if (!isRecord(value)) return {};

  const result: Record<string, string> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === 'string') result[key] = item;
  }
  return result;
};

const authResult = (value: unknown): SearchAuth => {
  if (!isRecord(value)) return { ok: false, error: 'Could not resolve provider credentials.' };
  if (value.ok !== true) {
    return { ok: false, error: stringValue(value.error) || 'Could not resolve provider credentials.' };
  }

  const apiKey = stringValue(value.apiKey);
  const headers = stringRecordValue(value.headers);
  return {
    ok: true,
    ...(apiKey ? { apiKey } : {}),
    ...(Object.keys(headers).length > 0 ? { headers } : {})
  };
};

export const resolveSearchAuth = async (modelRegistry: ModelRegistry, model: SearchModel): Promise<SearchAuth> => {
  const registry = modelRegistry as RegistryWithAuth;
  if (typeof registry.getApiKeyAndHeaders === 'function') {
    return authResult(await registry.getApiKeyAndHeaders(model));
  }

  if (typeof registry.getApiKey === 'function') {
    const apiKey = stringValue(await registry.getApiKey(model));
    if (!apiKey) return { ok: false, error: 'No API key configured for model.' };
    return { ok: true, apiKey };
  }

  return { ok: false, error: 'Model registry does not support credential retrieval.' };
};

export const searchProvider = (model: SearchModel): WebSearchProvider | null => {
  const provider = model.provider.toLowerCase();
  const api = model.api.toLowerCase();

  if (provider === 'openai' && api === 'openai-responses') return 'openai';
  if (provider === 'anthropic' && api === 'anthropic-messages') return 'anthropic';
  if (provider === 'google' && api === 'google-generative-ai') return 'google';
  if (provider === 'google-generative-ai' && api === 'google-generative-ai') return 'google';
  return null;
};

export const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

export const titleFromUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    const segment = parsed.pathname.split('/').filter(Boolean).pop();
    return segment || parsed.hostname || url;
  } catch {
    return url;
  }
};

export const normalizeSourceUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    for (const key of [...parsed.searchParams.keys()]) {
      if (key.toLowerCase().startsWith('utm_')) parsed.searchParams.delete(key);
    }
    for (const key of ['ref', 'referral_type']) parsed.searchParams.delete(key);
    parsed.search = parsed.searchParams.toString() ? `?${parsed.searchParams.toString()}` : '';
    return parsed.toString();
  } catch {
    return url;
  }
};

export const addSource = (sources: SearchSource[], source: SearchSource) => {
  const url = normalizeSourceUrl(source.url);
  if (!url) return;
  if (sources.some((item) => item.url === url)) return;
  sources.push({ url, title: source.title || titleFromUrl(url) });
};

export const sourceFromUrl = (url: string, title: string): SearchSource => ({ url, title: title || titleFromUrl(url) });

export const addString = (values: string[], value: unknown) => {
  const text = stringValue(value);
  if (text && !values.includes(text)) values.push(text);
};

export const withSources = (text: string, sources: readonly SearchSource[]) => {
  if (sources.length === 0) return text;
  return `${text}\n\n## Sources\n${sources.map((source, index) => `${index + 1}. [${source.title}](${source.url})`).join('\n')}`;
};

export const withUngroundedWarning = (text: string, grounded: boolean) => {
  if (grounded) return text;
  return `${text}\n\n## Search Verification\nNo verified native search metadata or sources were returned. Treat this answer as ungrounded.`;
};

export const recordItems = (value: unknown): JsonRecord[] => (Array.isArray(value) ? value.filter(isRecord) : []);

export const stringItems = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.length > 0) : [];

export const recordValue = (value: unknown, key: string) => (isRecord(value) ? value[key] : '');
