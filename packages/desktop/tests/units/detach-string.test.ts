import { detachString, releaseDetachStringBuffer } from '@renderer/shared/workspace/changes/diff/detach-string';
import { afterEach, describe, expect, it } from 'vitest';

describe('detachString', () => {
  afterEach(() => {
    releaseDetachStringBuffer();
  });

  it('returns the empty string unchanged', () => {
    expect(detachString('')).toBe('');
  });

  it('returns an equal value for ASCII content', () => {
    const source = 'hello world';
    const detached = detachString(source);
    expect(detached).toBe(source);
  });

  it('returns an equal value for multibyte UTF-8 content', () => {
    const source = 'café — 🚀 — テスト';
    expect(detachString(source)).toBe(source);
  });

  it('returns the value of a slice taken from a large parent string', () => {
    const parent = `${'a'.repeat(2048)}needle${'b'.repeat(2048)}`;
    expect(detachString(parent.slice(2048, 2054))).toBe('needle');
  });

  it('grows the internal buffer to fit longer inputs', () => {
    const source = 'x'.repeat(4096);
    expect(detachString(source)).toBe(source);
  });

  it('round-trips lone surrogate halves via JSON instead of utf-8', () => {
    const source = '\uD834';
    expect(detachString(source)).toBe(source);
  });
});
