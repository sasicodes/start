const maxLineLength = 500;
const maxOutputLength = 80_000;

export const maxContext = 3;
export const maxFindLimit = 200;
export const maxGrepLimit = 100;
export const maxPatternLength = 512;
export const defaultFindLimit = 200;
export const defaultGrepLimit = 100;
export const maxMultiGrepPatterns = 8;

export const positiveLimit = (value: number | null = null, fallback: number, max: number) => {
  if (!value || !Number.isFinite(value)) return fallback;
  return Math.min(Math.max(1, Math.floor(value)), max);
};

export const positiveCursor = (value: number | null = null) => {
  if (!value || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
};

export const positiveContext = (value: number | null = null) => {
  if (!value || !Number.isFinite(value)) return 0;
  return Math.min(Math.max(0, Math.floor(value)), maxContext);
};

export const boundedPatterns = (patterns: string[]) =>
  patterns
    .map((pattern) => pattern.slice(0, maxPatternLength))
    .filter(Boolean)
    .slice(0, maxMultiGrepPatterns);

export const boundedLine = (text: string) =>
  text.length > maxLineLength ? `${text.slice(0, maxLineLength)}...` : text;

export const boundedOutput = (text: string) =>
  text.length > maxOutputLength ? `${text.slice(0, maxOutputLength)}\n[Output truncated.]` : text;

export const findArgs = (pattern: string, path?: string, limit?: number) => ({
  pattern,
  ...(path ? { path } : {}),
  ...(typeof limit === 'number' ? { limit } : {})
});

export const grepArgs = (
  pattern: string,
  path?: string,
  glob?: string,
  ignoreCase?: boolean,
  literal?: boolean,
  context?: number,
  limit?: number
) => ({
  pattern,
  ...(path ? { path } : {}),
  ...(glob ? { glob } : {}),
  ...(typeof limit === 'number' ? { limit } : {}),
  ...(typeof context === 'number' ? { context } : {}),
  ...(typeof literal === 'boolean' ? { literal } : {}),
  ...(typeof ignoreCase === 'boolean' ? { ignoreCase } : {})
});
