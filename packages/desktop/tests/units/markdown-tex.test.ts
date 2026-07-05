import { normalizeTexDelimiters } from '@renderer/markdown/tex';
import { describe, expect, it } from 'vitest';

describe('normalizeTexDelimiters', () => {
  it('returns the same reference when no tex delimiters exist', () => {
    const source = 'plain text with $x + y$ math';
    expect(normalizeTexDelimiters(source)).toBe(source);
  });

  it('converts inline tex to single dollar math', () => {
    expect(normalizeTexDelimiters('the value \\(x^2 + 1\\) grows')).toBe('the value $x^2 + 1$ grows');
  });

  it('converts display tex to double dollar math across lines', () => {
    expect(normalizeTexDelimiters('\\[\n\\frac{a}{b}\n\\]')).toBe('$$\n\\frac{a}{b}\n$$');
  });

  it('converts multiple delimiters in one source', () => {
    expect(normalizeTexDelimiters('\\(a\\) and \\(b\\) give \\[a + b\\]')).toBe('$a$ and $b$ give $$a + b$$');
  });

  it('leaves fenced code blocks untouched', () => {
    const source = 'before \\(x\\)\n```tex\n\\(raw\\)\n```\nafter';
    expect(normalizeTexDelimiters(source)).toBe('before $x$\n```tex\n\\(raw\\)\n```\nafter');
  });

  it('leaves inline code untouched', () => {
    expect(normalizeTexDelimiters('use `\\(escape\\)` with \\(y\\)')).toBe('use `\\(escape\\)` with $y$');
  });

  it('keeps unclosed streaming delimiters literal until completed', () => {
    expect(normalizeTexDelimiters('partial \\(x + ')).toBe('partial \\(x + ');
  });

  it('wraps bare math environments in display math', () => {
    expect(normalizeTexDelimiters('\\begin{align}\na &= b\n\\end{align}')).toBe(
      '$$\\begin{align}\na &= b\n\\end{align}$$'
    );
  });

  it('does not rewrap environments already inside display math', () => {
    const source = '$$\\begin{align}\na &= b\n\\end{align}$$ and \\(c\\)';
    expect(normalizeTexDelimiters(source)).toBe('$$\\begin{align}\na &= b\n\\end{align}$$ and $c$');
  });

  it('leaves unknown environments alone', () => {
    const source = 'about \\begin{verbatim}x\\end{verbatim} blocks \\(y\\)';
    expect(normalizeTexDelimiters(source)).toBe('about \\begin{verbatim}x\\end{verbatim} blocks $y$');
  });
});
