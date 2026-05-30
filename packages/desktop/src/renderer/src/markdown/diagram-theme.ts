const cssVarPattern = /^var\(\s*(--[\w-]+)\s*\)$/;

export type CssVarLookup = (name: string) => string;

export const resolveCssVar = (value: string, lookup: CssVarLookup): string => {
  const name = cssVarPattern.exec(value)?.[1];
  if (!name) return value;
  const resolved = lookup(name).trim();
  return resolved || value;
};

export const resolveDiagramThemeVariables = <T extends Record<string, string>>(
  variables: T,
  lookup: CssVarLookup
): T => {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(variables)) {
    out[key] = resolveCssVar(value, lookup);
  }
  return out as T;
};

export const documentCssVarLookup: CssVarLookup = (name) =>
  getComputedStyle(document.documentElement).getPropertyValue(name);
