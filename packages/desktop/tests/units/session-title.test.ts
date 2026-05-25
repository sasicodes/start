import { describe, expect, it } from 'vitest';
import { truncateTitle } from '@main/sessions';

describe('truncateTitle', () => {
  it('falls back to "Untitled session" when text is empty', () => {
    expect(truncateTitle('')).toBe('Untitled session');
    expect(truncateTitle('   ')).toBe('Untitled session');
    expect(truncateTitle('\n\t')).toBe('Untitled session');
  });

  it('collapses whitespace into single spaces', () => {
    expect(truncateTitle('hello   world\nagain')).toBe('hello world again');
  });

  it('keeps short text intact', () => {
    expect(truncateTitle('Refactor the diff panel')).toBe('Refactor the diff panel');
  });

  it('truncates long text with an ellipsis at the 120-char boundary', () => {
    const long = 'a'.repeat(150);
    const result = truncateTitle(long);
    expect(result.length).toBe(120);
    expect(result.endsWith('…')).toBe(true);
    expect(result.startsWith('a'.repeat(119))).toBe(true);
  });

  it('trims trailing whitespace before the ellipsis', () => {
    const text = `${'word '.repeat(30)}end`;
    const result = truncateTitle(text);
    expect(result.endsWith(' …')).toBe(false);
    expect(result.endsWith('…')).toBe(true);
  });
});
