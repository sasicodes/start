import type { ModelRegistry } from '@earendil-works/pi-coding-agent';
import { resolveSearchAuth } from '@main/providers/tools/search/helpers';
import type { SearchModel } from '@main/providers/tools/search/types';

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
  if (auth.apiKey && !headers.Authorization && !headers.authorization) headers.Authorization = `Bearer ${auth.apiKey}`;
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
    if (!headers.Authorization && !headers.authorization) headers.Authorization = `Bearer ${auth.apiKey}`;
    headers['anthropic-beta'] = headers['anthropic-beta']
      ? `${headers['anthropic-beta']},claude-code-20250219,oauth-2025-04-20`
      : 'claude-code-20250219,oauth-2025-04-20';
    headers['user-agent'] = headers['user-agent'] || 'claude-cli/2.1.75';
    headers['x-app'] = headers['x-app'] || 'cli';
    return headers;
  }

  if (!headers['x-api-key'] && !headers['X-Api-Key']) headers['x-api-key'] = auth.apiKey;
  return headers;
};
