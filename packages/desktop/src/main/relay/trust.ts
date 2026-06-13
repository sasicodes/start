import { createHmac, timingSafeEqual } from 'node:crypto';
import { readStartState, type TrustedMobileDevice, updateStartState } from '@main/storage';

interface TrustDeviceInput {
  name?: string;
  mobileId: string;
  trustKey?: string;
}

interface VerifyResumeInput {
  proof: string;
  nonce: string;
  mobileId: string;
  desktopId: string;
}

const trustProofPayload = (desktopId: string, mobileId: string, nonce: string) => `${desktopId}\n${mobileId}\n${nonce}`;

export const mobileTrustProof = (trustKey: string, desktopId: string, mobileId: string, nonce: string) =>
  createHmac('sha256', Buffer.from(trustKey, 'base64'))
    .update(trustProofPayload(desktopId, mobileId, nonce))
    .digest('base64');

export const trustMobileDevice = ({ mobileId, name, trustKey }: TrustDeviceInput): void => {
  if (!mobileId || !trustKey) return;

  const state = readStartState();
  const current = state.trustedMobileDevices?.[mobileId];
  const device: TrustedMobileDevice = {
    mobileId,
    trustKey,
    pairedAt: current?.pairedAt ?? Date.now(),
    lastSeenAt: Date.now(),
    ...(name ? { name } : {})
  };

  updateStartState({
    trustedMobileDevices: {
      ...(state.trustedMobileDevices ?? {}),
      [mobileId]: device
    }
  });
};

export const verifyMobileResume = ({ desktopId, mobileId, nonce, proof }: VerifyResumeInput): boolean => {
  const state = readStartState();
  const device = state.trustedMobileDevices?.[mobileId];
  if (!device) return false;

  const expected = Buffer.from(mobileTrustProof(device.trustKey, desktopId, mobileId, nonce));
  const received = Buffer.from(proof);
  if (expected.length !== received.length) return false;
  if (!timingSafeEqual(expected, received)) return false;

  updateStartState({
    trustedMobileDevices: {
      ...(state.trustedMobileDevices ?? {}),
      [mobileId]: {
        ...device,
        lastSeenAt: Date.now()
      }
    }
  });
  return true;
};
