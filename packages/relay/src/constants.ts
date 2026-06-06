export const clientNameMaxLength = 80;
export const idMaxLength = 128;
export const maxPairingSessions = 128;
export const messageMaxBytes = 256 * 1024;
export const pairingCodeLength = 6;
export const pairingCodeMax = 999999;
export const pairingCodeMin = 100000;
export const pairingTtlDefaultMs = 5 * 60 * 1000;
export const portDefault = 8787;
export const protocolVersion = 1;
export const relaySocketPath = '/connect';
export const tokenMaxLength = 4096;

export const environmentKey = {
  port: 'PORT',
  token: 'START_RELAY_TOKEN',
  pairingTtlMs: 'START_RELAY_PAIRING_TTL_MS'
} as const;
