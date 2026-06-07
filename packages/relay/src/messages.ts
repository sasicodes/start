import type { PairingRequest, PairingResumeRequest, RelayError } from './types';

export const pairingRequestMessage = ({ code, name, mobileId, publicKey, trustKey }: PairingRequest) => ({
  type: 'pairing.request' as const,
  code,
  mobileId,
  ...(name ? { name } : {}),
  ...(trustKey ? { trustKey } : {}),
  ...(publicKey ? { publicKey } : {})
});

export const pairingResumeMessage = ({ mobileId, nonce, proof }: PairingResumeRequest) => ({
  type: 'pairing.resume' as const,
  proof,
  nonce,
  mobileId
});

export const relayError = (message: string): RelayError => ({
  type: 'relay.error',
  message
});
