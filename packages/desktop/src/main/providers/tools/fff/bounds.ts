import { boundedContext, boundedCount, maxGrepContext, maxGrepPageSize } from '@main/search/limits';
import { truncate } from '@main/utils/text';
import * as v from 'valibot';

const maxLineLength = 500;
const maxOutputLength = 80_000;

export const maxFindLimit = 200;
export const maxPatternLength = 512;
export const defaultFindLimit = 200;
export const maxMultiGrepPatterns = 8;
export const maxContext = maxGrepContext;
export const maxGrepLimit = maxGrepPageSize;
export const defaultGrepLimit = maxGrepPageSize;

const booleanSchema = v.boolean();
const positiveSchema = v.pipe(v.number(), v.finite(), v.minValue(1));
const nonNegativeSchema = v.pipe(v.number(), v.finite(), v.minValue(0));

export const optionalBoolean = (value: unknown) => {
  const parsed = v.safeParse(booleanSchema, value);
  return parsed.success ? parsed.output : null;
};

export const positiveLimit = (value: number | null = null, fallback: number, max: number) => {
  const parsed = v.safeParse(positiveSchema, value);
  return boundedCount(parsed.success ? parsed.output : fallback, max);
};

export const positiveCursor = (value: number | null = null) => {
  const parsed = v.safeParse(nonNegativeSchema, value);
  return parsed.success ? Math.floor(parsed.output) : 0;
};

export const positiveContext = (value: number | null = null) => {
  const parsed = v.safeParse(nonNegativeSchema, value);
  return boundedContext(parsed.success ? parsed.output : 0);
};

export const boundedPatterns = (patterns: string[]) =>
  patterns
    .map((pattern) => pattern.slice(0, maxPatternLength))
    .filter(Boolean)
    .slice(0, maxMultiGrepPatterns);

export const boundedLine = (text: string) => truncate(text, maxLineLength, '...');

export const boundedOutput = (text: string) => truncate(text, maxOutputLength, '\n[Output truncated.]');
