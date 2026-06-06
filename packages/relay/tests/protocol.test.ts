import { parseJsonMessage } from '../src/protocol';
import { describe, expect, it } from 'vitest';

describe('relay protocol', () => {
  it('parses bounded JSON messages', () => {
    expect(parseJsonMessage('{"ok":true}')).toEqual({ ok: true, value: { ok: true } });
  });

  it('rejects invalid JSON messages', () => {
    expect(parseJsonMessage('{')).toEqual({ ok: false, error: 'Message is not valid JSON.' });
  });

  it('rejects oversized JSON messages', () => {
    expect(parseJsonMessage(' '.repeat(256 * 1024 + 1))).toEqual({ ok: false, error: 'Message is too large.' });
  });
});
