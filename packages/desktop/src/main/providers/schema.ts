import * as v from 'valibot';

export const maxThinkingLabels = 4;

export const reservedProviderNames = ['google', 'openai', 'anthropic'] as const;

export const isReservedProviderName = (name: string) =>
  (reservedProviderNames as readonly string[]).includes(name.trim().toLowerCase());

const trimmed = v.pipe(v.string(), v.trim());

export const customProviderModelSchema = v.object({
  id: v.pipe(trimmed, v.minLength(1)),
  name: v.optional(v.pipe(trimmed, v.minLength(1)))
});

export const customProviderConfigSchema = v.object({
  name: v.pipe(trimmed, v.minLength(1, 'Name is required.')),
  apiKey: v.pipe(trimmed, v.minLength(1, 'API key is required.')),
  baseUrl: v.pipe(trimmed, v.minLength(1, 'Base URL is required.')),
  models: v.pipe(v.array(customProviderModelSchema), v.minLength(1, 'At least one model ID is required.')),
  thinkingLabels: v.optional(
    v.pipe(
      v.array(trimmed),
      v.transform((labels) => labels.filter((label) => label.length > 0)),
      v.maxLength(maxThinkingLabels, `Thinking levels supports at most ${maxThinkingLabels} entries.`)
    )
  )
});

export const writableCustomProviderConfigSchema = v.pipe(
  customProviderConfigSchema,
  v.check((config) => !isReservedProviderName(config.name), 'That name is reserved for a built-in provider.')
);

export type CustomProviderModel = v.InferOutput<typeof customProviderModelSchema>;
export type CustomProviderConfig = v.InferOutput<typeof customProviderConfigSchema>;
