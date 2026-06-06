import type { ModelRegistry } from '@earendil-works/pi-coding-agent';
import {
  bearerTokenFromAuthorization,
  headerValue,
  providerHeaders,
  setMissingHeader
} from '@main/providers/tools/search/auth';
import { trimTrailingSlash } from '@main/providers/tools/search/helpers';
import type { SearchModel } from '@main/providers/tools/search/types';
import * as v from 'valibot';

const defaultCodexBaseUrl = 'https://chatgpt.com/backend-api';
const jwtClaimPath = 'https://api.openai.com/auth';

const codexAuthSchema = v.object({
  [jwtClaimPath]: v.object({
    chatgpt_account_id: v.pipe(v.string(), v.trim(), v.minLength(1))
  })
});

export const codexSearchInstructions =
  'Use web search to answer the user query with current, source-backed information.';

export const isCodexModel = (model: SearchModel) => model.api.toLowerCase() === 'openai-codex-responses';

export const codexResponsesUrl = (baseUrl: string) => {
  const raw = baseUrl.trim() || defaultCodexBaseUrl;
  const normalized = trimTrailingSlash(raw);
  if (normalized.endsWith('/codex/responses')) return normalized;
  if (normalized.endsWith('/codex')) return `${normalized}/responses`;
  return `${normalized}/codex/responses`;
};

export const codexInput = (query: string) => [
  {
    role: 'user',
    content: [{ type: 'input_text', text: query }]
  }
];

const bearerTokenFromHeaders = (headers: Record<string, string>) =>
  bearerTokenFromAuthorization(headerValue(headers, 'authorization'));

const accountIdFromToken = (token: string) => {
  try {
    const payload = token.split('.')[1];
    if (payload) {
      const decoded = Buffer.from(payload.replaceAll('-', '+').replaceAll('_', '/'), 'base64').toString('utf8');
      const parsed: unknown = JSON.parse(decoded);
      const result = v.safeParse(codexAuthSchema, parsed);
      if (result.success) return result.output[jwtClaimPath].chatgpt_account_id;
    }
  } catch {}

  throw new Error('Failed to extract accountId from token.');
};

export const codexHeaders = async (
  modelRegistry: ModelRegistry,
  model: SearchModel,
  defaults: Record<string, string>
) => {
  const { auth, headers } = await providerHeaders(modelRegistry, model, defaults);
  const token = auth.apiKey || bearerTokenFromHeaders(headers);
  if (!token) throw new Error('No API key configured for model.');

  setMissingHeader(headers, 'Authorization', `Bearer ${token}`);
  if (!headerValue(headers, 'chatgpt-account-id')) {
    setMissingHeader(headers, 'chatgpt-account-id', accountIdFromToken(token));
  }
  setMissingHeader(headers, 'OpenAI-Beta', 'responses=experimental');
  setMissingHeader(headers, 'originator', 'pi');
  return headers;
};
