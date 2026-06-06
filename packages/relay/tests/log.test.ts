import { describe, expect, it } from 'vitest';
import { messageType } from '../src/log';

describe('messageType', () => {
  it('returns the type field when it is a string', () => {
    expect(messageType({ type: 'pairing.create' })).toBe('pairing.create');
  });

  it('falls back to unknown when the type field is missing', () => {
    expect(messageType({ code: '123456' })).toBe('unknown');
  });

  it('falls back to unknown when the type field is not a string', () => {
    expect(messageType({ type: 42 })).toBe('unknown');
  });

  it('falls back to unknown for non-object payloads', () => {
    expect(messageType(null)).toBe('unknown');
    expect(messageType('pairing.create')).toBe('unknown');
    expect(messageType(undefined)).toBe('unknown');
  });
});
