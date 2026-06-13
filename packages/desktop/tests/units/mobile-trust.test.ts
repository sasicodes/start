import { mobileTrustProof, trustMobileDevice, verifyMobileResume } from '@main/relay/trust';
import { describe, expect, it } from 'vitest';
import { getStorageSnapshot, resetStorage } from '../fakes/storage.js';

describe('mobile relay trust', () => {
  it('stores a trusted mobile device and verifies its resume proof', () => {
    resetStorage();

    trustMobileDevice({
      name: 'iPhone',
      mobileId: 'mobile-1',
      trustKey: Buffer.from('secret-key').toString('base64')
    });

    const proof = mobileTrustProof(Buffer.from('secret-key').toString('base64'), 'desktop-1', 'mobile-1', 'nonce-1');

    expect(
      verifyMobileResume({
        proof,
        nonce: 'nonce-1',
        mobileId: 'mobile-1',
        desktopId: 'desktop-1'
      })
    ).toBe(true);
    expect(getStorageSnapshot().trustedMobileDevices?.['mobile-1']?.name).toBe('iPhone');
    expect(getStorageSnapshot().trustedMobileDevices?.['mobile-1']?.lastSeenAt).toBeGreaterThan(0);
  });

  it('rejects unknown mobiles and bad proofs', () => {
    resetStorage();

    trustMobileDevice({
      mobileId: 'mobile-1',
      trustKey: Buffer.from('secret-key').toString('base64')
    });

    expect(
      verifyMobileResume({
        proof: 'bad-proof',
        nonce: 'nonce-1',
        mobileId: 'mobile-1',
        desktopId: 'desktop-1'
      })
    ).toBe(false);
    expect(
      verifyMobileResume({
        proof: 'bad-proof',
        nonce: 'nonce-1',
        mobileId: 'mobile-2',
        desktopId: 'desktop-1'
      })
    ).toBe(false);
  });
});
