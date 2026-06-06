import { loadConfig, tokenWarning } from '../src/config';
import { describe, expect, it } from 'vitest';

describe('loadConfig', () => {
  it('loads relay token and server settings from the environment', () => {
    expect(
      loadConfig({
        PORT: '9000',
        START_RELAY_TOKEN: 'secret',
        START_RELAY_PAIRING_TTL_MS: '120000'
      })
    ).toEqual({
      port: 9000,
      token: 'secret',
      pairingTtlMs: 120000
    });
  });

  it('uses safe defaults when optional environment values are absent', () => {
    expect(loadConfig({})).toEqual({
      port: 8787,
      token: '',
      pairingTtlMs: 300000
    });
  });
});

describe('tokenWarning', () => {
  it('warns when no token is configured', () => {
    expect(tokenWarning('')).toMatch(/START_RELAY_TOKEN is not set/u);
  });

  it('stays silent when a token is configured', () => {
    expect(tokenWarning('secret')).toBe('');
  });
});
