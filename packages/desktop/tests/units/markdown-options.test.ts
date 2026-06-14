import { hasFootnoteProperty } from '@renderer/markdown/footnotes';
import { describe, expect, it } from 'vitest';

describe('markdown footnotes', () => {
  it('identifies footnote helper properties', () => {
    expect(hasFootnoteProperty({ dataFootnotes: true })).toBe(true);
    expect(hasFootnoteProperty({ 'data-footnote-ref': true })).toBe(true);
  });

  it('ignores regular and invalid property shapes', () => {
    expect(hasFootnoteProperty({ className: ['note'] })).toBe(false);
    expect(hasFootnoteProperty(null)).toBe(false);
    expect(hasFootnoteProperty('properties')).toBe(false);
  });
});
