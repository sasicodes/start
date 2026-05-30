const cssVarPattern = /^var\(\s*(--[\w-]+)\s*\)$/;

export type CssVarLookup = (name: string) => string;

export const resolveCssVar = (value: string, lookup: CssVarLookup): string => {
  const name = cssVarPattern.exec(value)?.[1];
  if (!name) return value;
  const resolved = lookup(name).trim();
  return resolved || value;
};

export const resolveDiagramThemeVariables = (
  variables: Record<string, string>,
  lookup: CssVarLookup
): Record<string, string> =>
  Object.fromEntries(Object.entries(variables).map(([key, value]) => [key, resolveCssVar(value, lookup)]));

export const diagramThemeVariables = {
  mainBkg: 'var(--color-composer)',
  fontFamily: 'system-ui',
  lineColor: 'var(--color-soft)',
  nodeBorder: 'var(--color-line)',
  background: 'transparent',
  tertiaryColor: 'transparent',
  primaryColor: 'var(--color-composer)',
  secondaryColor: 'var(--color-muted)',
  primaryTextColor: 'var(--color-ink)',
  tertiaryTextColor: 'var(--color-soft)',
  secondaryTextColor: 'var(--color-ink)',
  primaryBorderColor: 'var(--color-line)',
  tertiaryBorderColor: 'var(--color-line)',
  secondaryBorderColor: 'var(--color-line)'
} as const;
