import type { ModelRegistry } from '@earendil-works/pi-coding-agent';
import { resolveSearchAuth } from '@main/providers/tools/search/helpers';
import type { SearchModel } from '@main/providers/tools/search/types';

const headerKey = (headers: Record<string, string>, name: string) =>
  Object.keys(headers).find((key) => key.toLowerCase() === name.toLowerCase()) || '';

export const headerValue = (headers: Record<string, string>, name: string) => {
  const key = headerKey(headers, name);
  return key ? headers[key] || '' : '';
};

export const setHeader = (headers: Record<string, string>, name: string, value: string) => {
  const key = headerKey(headers, name) || name;
  headers[key] = value;
};

export const setMissingHeader = (headers: Record<string, string>, name: string, value: string) => {
  if (!headerValue(headers, name)) setHeader(headers, name, value);
};

export const bearerTokenFromAuthorization = (value: string) => {
  const trimmed = value.trim();
  const prefix = 'bearer ';
  if (!trimmed.toLowerCase().startsWith(prefix)) return '';
  return trimmed.slice(prefix.length).trim();
};

export const providerHeaders = async (
  modelRegistry: ModelRegistry,
  model: SearchModel,
  defaults: Record<string, string>
) => {
  const auth = await resolveSearchAuth(modelRegistry, model);
  if (!auth.ok) throw new Error(auth.error);

  const headers: Record<string, string> = {
    ...defaults,
    ...(model.headers ?? {}),
    ...(auth.headers ?? {})
  };
  return { auth, headers };
};

export const bearerHeaders = async (
  modelRegistry: ModelRegistry,
  model: SearchModel,
  defaults: Record<string, string>
) => {
  const { auth, headers } = await providerHeaders(modelRegistry, model, defaults);
  if (auth.apiKey) setMissingHeader(headers, 'Authorization', `Bearer ${auth.apiKey}`);
  return headers;
};

export const anthropicHeaders = async (
  modelRegistry: ModelRegistry,
  model: SearchModel,
  defaults: Record<string, string>
) => {
  const { auth, headers } = await providerHeaders(modelRegistry, model, defaults);
  if (!auth.apiKey) return headers;

  if (auth.apiKey.includes('sk-ant-oat')) {
    setMissingHeader(headers, 'Authorization', `Bearer ${auth.apiKey}`);
    const beta = headerValue(headers, 'anthropic-beta');
    setHeader(
      headers,
      'anthropic-beta',
      beta ? `${beta},claude-code-20250219,oauth-2025-04-20` : 'claude-code-20250219,oauth-2025-04-20'
    );
    setMissingHeader(headers, 'user-agent', 'claude-cli/2.1.75');
    setMissingHeader(headers, 'x-app', 'cli');
    return headers;
  }

  setMissingHeader(headers, 'x-api-key', auth.apiKey);
  return headers;
};
