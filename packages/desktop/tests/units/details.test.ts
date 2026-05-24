import {
  countLabel,
  isRecord,
  numberValue,
  previewValue,
  stringValue,
  textContent,
  thinkingContent
} from '@main/details';
import { describe, expect, it } from 'vitest';

describe('details helpers', () => {
  it('identifies non-null object values', () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord(null)).toBe(false);
    expect(isRecord('text')).toBe(false);
  });

  it('returns trimmed strings and zero for invalid numbers', () => {
    expect(stringValue('hello')).toBe('hello');
    expect(stringValue(42)).toBe('');
    expect(numberValue(7)).toBe(7);
    expect(numberValue('x')).toBe(0);
  });

  it('pluralizes count labels', () => {
    expect(countLabel(1, 'turn')).toBe('1 turn');
    expect(countLabel(2, 'turn')).toBe('2 turns');
  });

  it('joins text and image markers from content arrays', () => {
    expect(
      textContent([
        { type: 'text', text: 'one' },
        { type: 'image', mimeType: 'image/png' },
        { type: 'text', text: 'two' }
      ])
    ).toBe('one\n[image: image/png]\ntwo');
    expect(textContent('plain string')).toBe('plain string');
    expect(textContent([])).toBe('');
  });

  it('extracts thinking content and marks redacted parts', () => {
    expect(thinkingContent([{ type: 'thinking', thinking: 'a thought' }])).toBe('a thought');
    expect(thinkingContent([{ type: 'thinking', redacted: true }])).toBe('[redacted thinking]');
    expect(thinkingContent([])).toBe('');
  });

  it('previews objects without throwing on circular shapes', () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(typeof previewValue(cyclic)).toBe('string');
  });
});
