import { describe, expect, it } from 'vitest';
import { resolveCssVar, resolveDiagramThemeVariables } from '@renderer/markdown/diagram/theme';

const fakeLookup = (table: Record<string, string>) => (name: string) => table[name] ?? '';

describe('resolveCssVar', () => {
  it('resolves a var() expression to the looked-up value', () => {
    const lookup = fakeLookup({ '--color-ink': 'oklch(20% 0.01 255)' });
    expect(resolveCssVar('var(--color-ink)', lookup)).toBe('oklch(20% 0.01 255)');
  });

  it('trims whitespace around the resolved value', () => {
    const lookup = fakeLookup({ '--color-ink': '  #111  ' });
    expect(resolveCssVar('var(--color-ink)', lookup)).toBe('#111');
  });

  it('tolerates whitespace inside the var() expression', () => {
    const lookup = fakeLookup({ '--color-ink': '#222' });
    expect(resolveCssVar('var( --color-ink )', lookup)).toBe('#222');
  });

  it('returns the literal value when it is not a var() expression', () => {
    expect(resolveCssVar('transparent', fakeLookup({}))).toBe('transparent');
    expect(resolveCssVar('#fff', fakeLookup({}))).toBe('#fff');
    expect(resolveCssVar('system-ui', fakeLookup({}))).toBe('system-ui');
  });

  it('falls back to the original var() string when lookup is empty', () => {
    expect(resolveCssVar('var(--missing)', fakeLookup({}))).toBe('var(--missing)');
  });
});

describe('resolveDiagramThemeVariables', () => {
  it('resolves css vars and passes literals through', () => {
    const lookup = fakeLookup({
      '--color-ink': '#111',
      '--color-line': '#eee',
      '--color-soft': 'oklch(20% 0.01 255 / 0.62)'
    });
    const resolved = resolveDiagramThemeVariables(
      {
        fontFamily: 'system-ui',
        background: 'transparent',
        lineColor: 'var(--color-soft)',
        nodeBorder: 'var(--color-line)',
        primaryTextColor: 'var(--color-ink)'
      },
      lookup
    );
    expect(resolved).toEqual({
      nodeBorder: '#eee',
      primaryTextColor: '#111',
      fontFamily: 'system-ui',
      background: 'transparent',
      lineColor: 'oklch(20% 0.01 255 / 0.62)'
    });
  });

  it('keeps unresolved vars intact so the failure stays visible', () => {
    const resolved = resolveDiagramThemeVariables({ primaryColor: 'var(--missing)' }, fakeLookup({}));
    expect(resolved.primaryColor).toBe('var(--missing)');
  });
});
