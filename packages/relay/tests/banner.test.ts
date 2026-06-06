import { describe, expect, it } from 'vitest';
import { maskToken, relayBanner } from '../src/banner';

describe('maskToken', () => {
  it('returns a hyphen when no token is set', () => {
    expect(maskToken('')).toBe('-');
  });

  it('keeps the first four characters and masks the rest', () => {
    expect(maskToken('secrettoken')).toBe('secr*******');
  });

  it('caps the masked length so the table stays tidy', () => {
    expect(maskToken('s'.repeat(64))).toBe('ssss************');
  });
});

describe('relayBanner', () => {
  it('renders the relay url and masked token', () => {
    const banner = relayBanner('ws://localhost:8787/connect', 'secrettoken');
    expect(banner).toContain('Relay URL');
    expect(banner).toContain('ws://localhost:8787/connect');
    expect(banner).toContain('secr*******');
    expect(banner).toContain('┌');
  });

  it('shows a hyphen for the token row when no token is configured', () => {
    const banner = relayBanner('ws://localhost:8787/connect', '');
    expect(banner).toMatch(/Relay token\s+│ -/u);
  });
});
