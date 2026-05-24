import { API_KEY_MASK, apiKeyInputValue } from '@renderer/shared/settings/api-key';
import { describe, expect, it } from 'vitest';

describe('apiKeyInputValue', () => {
  it('shows the user draft when typing, regardless of stored state', () => {
    expect(apiKeyInputValue('sk-typed', false, true)).toBe('sk-typed');
    expect(apiKeyInputValue('sk-typed', true, true)).toBe('sk-typed');
    expect(apiKeyInputValue('sk-typed', true, false)).toBe('sk-typed');
  });

  it('shows the mask when a key is stored and the user is not editing', () => {
    expect(apiKeyInputValue('', true, false)).toBe(API_KEY_MASK);
  });

  it('hides the mask while the user is editing so they can type fresh', () => {
    expect(apiKeyInputValue('', true, true)).toBe('');
  });

  it('returns empty when no key is stored and no draft exists', () => {
    expect(apiKeyInputValue('', false, false)).toBe('');
    expect(apiKeyInputValue('', false, true)).toBe('');
  });
});
