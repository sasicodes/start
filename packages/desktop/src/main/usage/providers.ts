import { timestampValue } from '@main/details';
import type { ProviderKey } from '@main/types';
import type { ProviderUsage, ProviderUsageCredential } from '@main/usage/types';
import * as v from 'valibot';

const requestTimeoutMs = 10_000;

const codexWindowSchema = v.looseObject({
  used_percent: v.number(),
  reset_at: v.optional(v.nullable(v.number()))
});

const codexUsageSchema = v.looseObject({
  rate_limit: v.looseObject({
    primary_window: v.optional(v.nullable(codexWindowSchema)),
    secondary_window: v.optional(v.nullable(codexWindowSchema))
  })
});

const claudeWindowSchema = v.looseObject({
  utilization: v.number(),
  resets_at: v.optional(v.nullable(v.string()))
});

const claudeUsageSchema = v.looseObject({
  five_hour: v.optional(v.nullable(claudeWindowSchema)),
  seven_day: v.optional(v.nullable(claudeWindowSchema))
});

interface UsageWindow {
  resetAt?: number;
  usedPercent: number;
}

const clampPercent = (value: number) => Math.min(100, Math.max(0, value));

const timestampFromSeconds = (value: number | null) => {
  if (!value || value <= 0) return 0;
  return value * 1000;
};

const selectUsage = (id: ProviderKey, name: string, windows: UsageWindow[]) => {
  const selected = [...windows].sort(
    (left, right) => right.usedPercent - left.usedPercent || (left.resetAt ?? Infinity) - (right.resetAt ?? Infinity)
  )[0];
  if (!selected) throw new Error(`${name} did not return a supported usage window.`);

  return {
    id,
    ...(selected.resetAt ? { resetAt: selected.resetAt } : {}),
    remainingPercent: Math.round(100 - clampPercent(selected.usedPercent))
  } satisfies ProviderUsage;
};

const parseCodexUsage = (value: unknown) => {
  const result = v.safeParse(codexUsageSchema, value);
  if (!result.success) throw new Error('OpenAI returned an invalid usage response.');

  const windows = [result.output.rate_limit.primary_window, result.output.rate_limit.secondary_window].flatMap(
    (window): UsageWindow[] => {
      if (!window) return [];
      const resetAt = timestampFromSeconds(window.reset_at ?? null);
      return [
        {
          ...(resetAt ? { resetAt } : {}),
          usedPercent: window.used_percent
        }
      ];
    }
  );

  return selectUsage('openai', 'OpenAI', windows);
};

const parseClaudeUsage = (value: unknown) => {
  const result = v.safeParse(claudeUsageSchema, value);
  if (!result.success) throw new Error('Anthropic returned an invalid usage response.');

  const windows = [result.output.five_hour, result.output.seven_day].flatMap((window): UsageWindow[] => {
    if (!window) return [];
    const resetAt = timestampValue(window.resets_at);
    return [
      {
        ...(resetAt ? { resetAt } : {}),
        usedPercent: window.utilization
      }
    ];
  });

  return selectUsage('anthropic', 'Anthropic', windows);
};

const fetchJson = async (url: string, headers: Record<string, string>) => {
  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(requestTimeoutMs)
  });
  if (!response.ok) throw new Error(`Usage request failed with status ${response.status}.`);
  return response.json() as Promise<unknown>;
};

export const fetchProviderUsage = async (provider: ProviderKey, credential: ProviderUsageCredential) => {
  if (provider === 'openai') {
    if (!credential.accountId) throw new Error('OpenAI account ID is unavailable.');
    const value = await fetchJson('https://chatgpt.com/backend-api/wham/usage', {
      'ChatGPT-Account-Id': credential.accountId,
      Authorization: `Bearer ${credential.token}`
    });
    return parseCodexUsage(value);
  }

  const value = await fetchJson('https://api.anthropic.com/api/oauth/usage', {
    'User-Agent': 'claude-code/2.1.80',
    'anthropic-beta': 'oauth-2025-04-20',
    Authorization: `Bearer ${credential.token}`
  });
  return parseClaudeUsage(value);
};

export const parseProviderUsage = (provider: ProviderKey, value: unknown) =>
  provider === 'openai' ? parseCodexUsage(value) : parseClaudeUsage(value);
