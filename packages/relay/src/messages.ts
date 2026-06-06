import type { PairingRequest, RelayError } from './types';

export const pairingRequestMessage = ({ code, name, mobileId, publicKey }: PairingRequest) => ({
  type: 'pairing.request' as const,
  code,
  mobileId,
  ...(name ? { name } : {}),
  ...(publicKey ? { publicKey } : {})
});

export const relayError = (message: string): RelayError => ({
  type: 'relay.error',
  message
});
