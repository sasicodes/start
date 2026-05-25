const localHostPattern = /^(localhost|127(?:\.\d{1,3}){3}|\[[^\]]+\])(?::\d+)?(?:[/?#]|$)/i;
const explicitSchemePattern = /^[a-z][a-z\d+.-]*:\/\//i;
const hostWithPortPattern = /^[^:/]+\.[^:/]+:\d+(?:[/?#]|$)/i;
const schemeLikePattern = /^[a-z][a-z\d+.-]*:/i;

const browserUrlScheme = (local: boolean) => (local ? 'http' : 'https');

const parseHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url;
  } catch {
    return null;
  }
};

const browserUrlCandidate = (value: string) => {
  if (explicitSchemePattern.test(value)) return value;

  const local = localHostPattern.test(value);
  const hostWithPort = hostWithPortPattern.test(value);
  const unsupportedSchemeLikeValue = schemeLikePattern.test(value) && !local && !hostWithPort;

  if (unsupportedSchemeLikeValue) return null;
  return `${browserUrlScheme(local)}://${value}`;
};

export const normalizeBrowserUrl = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const candidate = browserUrlCandidate(trimmed);
  if (!candidate) return null;

  return parseHttpUrl(candidate)?.toString() ?? null;
};
