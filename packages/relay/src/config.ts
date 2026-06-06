import * as v from 'valibot';
import { environmentKey, pairingTtlDefaultMs, portDefault } from './constants';
import type { RelayConfig } from './types';

const environmentValueSchema = v.optional(v.pipe(v.string(), v.trim()));

const environmentSchema = v.object({
  [environmentKey.port]: environmentValueSchema,
  [environmentKey.token]: environmentValueSchema,
  [environmentKey.pairingTtlMs]: environmentValueSchema
});

const parsePositiveInteger = (fallback: number, value?: string) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const loadConfig = (environment: NodeJS.ProcessEnv = process.env): RelayConfig => {
  const result = v.safeParse(environmentSchema, environment);
  const output = result.success ? result.output : {};

  return {
    port: parsePositiveInteger(portDefault, output[environmentKey.port]),
    token: output[environmentKey.token] ?? '',
    pairingTtlMs: parsePositiveInteger(pairingTtlDefaultMs, output[environmentKey.pairingTtlMs])
  };
};
