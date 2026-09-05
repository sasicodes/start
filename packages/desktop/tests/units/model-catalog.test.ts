import type { CredentialStore } from '@earendil-works/pi-ai';
import { hasApi } from '@earendil-works/pi-ai';
import { streamSimple as anthropicStream } from '@earendil-works/pi-ai/api/anthropic-messages';
import { streamSimple as codexStream } from '@earendil-works/pi-ai/api/openai-codex-responses';
import { streamSimple as openaiStream } from '@earendil-works/pi-ai/api/openai-responses';
import { clampThinkingLevel, getLatestProviderModels, getSupportedEffortLevels } from '@main/helpers';
import { allowedLatestModelOrder } from '@main/models';
import { configureModelEffort } from '@main/providers/effort';
import { expect, it, vi } from 'vitest';

it('includes every picker model and all four effort levels in the real offline runtime', async () => {
  const { ModelRuntime } = await vi.importActual<typeof import('@earendil-works/pi-coding-agent')>(
    '@earendil-works/pi-coding-agent'
  );
  const blockedFetch = vi.fn(async () => {
    throw new Error('Network access is disabled in this test.');
  });
  const credentials: CredentialStore = {
    read: async () => {},
    list: async () => [],
    delete: async () => {},
    modify: async (_provider, update) => update(await credentials.read(_provider))
  };
  const runtime = await ModelRuntime.create({ credentials, modelsPath: null, allowModelNetwork: false });

  configureModelEffort(runtime);
  await runtime.refresh({ allowNetwork: false });

  for (const provider of ['openai', 'openai-codex', 'anthropic']) {
    const group = provider === 'anthropic' ? 'anthropic' : 'openai';
    const visible = getLatestProviderModels(group, runtime.getModels(provider));
    expect(visible.map((model) => model.id)).toEqual(allowedLatestModelOrder(group));
    for (const model of visible) {
      expect(model.thinkingLevelMap?.xhigh, `${provider}:${model.id}`).toBe('max');
      expect(getSupportedEffortLevels(model), `${provider}:${model.id}`).toEqual(['low', 'medium', 'high', 'xhigh']);
      for (const level of getSupportedEffortLevels(model)) {
        expect(clampThinkingLevel(model, level)).toBe(level);
        let payload: unknown = null;
        const options = {
          reasoning: level,
          fetch: blockedFetch,
          apiKey: `test.${Buffer.from(JSON.stringify({ 'https://api.openai.com/auth': { chatgpt_account_id: 'test' } })).toString('base64url')}.test`,
          onPayload: (value: unknown) => {
            payload = value;
            throw new Error('Payload captured before sending.');
          }
        };
        const context = { messages: [] };
        if (hasApi(model, 'openai-responses')) await openaiStream(model, context, options).result();
        if (hasApi(model, 'openai-codex-responses')) await codexStream(model, context, options).result();
        if (hasApi(model, 'anthropic-messages')) await anthropicStream(model, context, options).result();
        const effort = level === 'xhigh' ? 'max' : level;
        if (hasApi(model, 'anthropic-messages') && model.compat?.supportsMidConvoEffort) {
          expect(payload, `${provider}:${model.id}:${level}`).toMatchObject({
            messages: expect.arrayContaining([{ role: 'system', content: [], output_config: { effort } }])
          });
        } else {
          expect(payload, `${provider}:${model.id}:${level}`).toMatchObject(
            provider === 'anthropic' ? { output_config: { effort } } : { reasoning: { effort } }
          );
        }
      }
    }
  }

  expect(blockedFetch).not.toHaveBeenCalled();
  expect(runtime.getModel('openai', 'gpt-6-astra')).toMatchObject({
    api: 'openai-responses',
    contextWindow: 272000,
    maxTokens: 128000
  });
  expect(runtime.getModel('openai-codex', 'gpt-6-astra')).toMatchObject({
    api: 'openai-codex-responses',
    contextWindow: 272000,
    maxTokens: 128000
  });
});
