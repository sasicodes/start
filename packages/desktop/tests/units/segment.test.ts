import { endsMidWord } from '@renderer/shared/chat/segment';
import { describe, expect, it } from 'vitest';

describe('endsMidWord', () => {
  it('treats a trailing letter or digit as mid-word', () => {
    expect(endsMidWord('mar')).toBe(true);
    expect(endsMidWord('r')).toBe(true);
    expect(endsMidWord('level9')).toBe(true);
    expect(endsMidWord('café')).toBe(true);
  });

  it('treats whitespace and punctuation as a safe boundary', () => {
    expect(endsMidWord('before a ')).toBe(false);
    expect(endsMidWord('markers).')).toBe(false);
    expect(endsMidWord('done,')).toBe(false);
    expect(endsMidWord('')).toBe(false);
  });
});
