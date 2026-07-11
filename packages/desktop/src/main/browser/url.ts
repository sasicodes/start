import { isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';

const localHostPattern = /^(localhost|127(?:\.\d{1,3}){3}|\[[^\]]+\])(?::\d+)?(?:[/?#]|$)/i;
const explicitSchemePattern = /^[a-z][a-z\d+.-]*:\/\//i;
const hostWithPortPattern = /^[^:/]+\.[^:/]+:\d+(?:[/?#]|$)/i;
const schemeLikePattern = /^[a-z][a-z\d+.-]*:/i;

const browserUrlScheme = (local: boolean) => (local ? 'http' : 'https');

const parseNavigableUrl = (value: string, allowFile: boolean) => {
  try {
    const url = new URL(value);
    const isAllowedProtocol =
      url.protocol === 'http:' || url.protocol === 'https:' || (allowFile && url.protocol === 'file:');
    if (!isAllowedProtocol) return null;
    return url;
  } catch {
    return null;
  }
};

const browserUrlCandidate = (value: string, allowFile: boolean) => {
  if (isAbsolute(value)) return allowFile ? pathToFileURL(value).toString() : null;
  if (explicitSchemePattern.test(value)) return value;

  const local = localHostPattern.test(value);
  const hostWithPort = hostWithPortPattern.test(value);
  const unsupportedSchemeLikeValue = schemeLikePattern.test(value) && !local && !hostWithPort;

  if (unsupportedSchemeLikeValue) return null;
  return `${browserUrlScheme(local)}://${value}`;
};

export const normalizeBrowserUrl = (value: string, options: { allowFile?: boolean } = {}): string | null => {
  const allowFile = options.allowFile ?? true;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const candidate = browserUrlCandidate(trimmed, allowFile);
  if (!candidate) return null;

  return parseNavigableUrl(candidate, allowFile)?.toString() ?? null;
};
