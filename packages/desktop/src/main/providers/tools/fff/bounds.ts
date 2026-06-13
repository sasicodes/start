import { boundedContext, boundedCount, maxGrepContext, maxGrepPageSize } from '@main/search/limits';

const maxLineLength = 500;
const maxOutputLength = 80_000;

export const maxFindLimit = 200;
export const maxPatternLength = 512;
export const defaultFindLimit = 200;
export const maxMultiGrepPatterns = 8;
export const maxContext = maxGrepContext;
export const maxGrepLimit = maxGrepPageSize;
export const defaultGrepLimit = maxGrepPageSize;

export const positiveLimit = (value: number | null = null, fallback: number, max: number) =>
  boundedCount(value && Number.isFinite(value) ? value : fallback, max);

export const positiveCursor = (value: number | null = null) => {
  if (!value || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
};

export const positiveContext = (value: number | null = null) => boundedContext(value ?? 0);

export const boundedPatterns = (patterns: string[]) =>
  patterns
    .map((pattern) => pattern.slice(0, maxPatternLength))
    .filter(Boolean)
    .slice(0, maxMultiGrepPatterns);

export const boundedLine = (text: string) =>
  text.length > maxLineLength ? `${text.slice(0, maxLineLength)}...` : text;

export const boundedOutput = (text: string) =>
  text.length > maxOutputLength ? `${text.slice(0, maxOutputLength)}\n[Output truncated.]` : text;
