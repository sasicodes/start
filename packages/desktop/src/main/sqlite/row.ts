import type { SQLOutputValue } from 'node:sqlite';

export type SqliteRow = Record<string, SQLOutputValue>;

const readValue = (row: SqliteRow, key: string): SQLOutputValue => row[key] ?? null;

export const readRequiredNumber = (row: SqliteRow, key: string): number => {
  const value = readValue(row, key);
  if (typeof value === 'number') return value;
  throw new Error(`Expected numeric SQLite value for ${key}.`);
};

export const readOptionalNumber = (row: SqliteRow, key: string): number | null => {
  const value = readValue(row, key);
  if (value === null) return null;
  if (typeof value === 'number') return value;
  throw new Error(`Expected nullable numeric SQLite value for ${key}.`);
};

export const readRequiredString = (row: SqliteRow, key: string): string => {
  const value = readValue(row, key);
  if (typeof value === 'string') return value;
  throw new Error(`Expected string SQLite value for ${key}.`);
};

export const readOptionalString = (row: SqliteRow, key: string): string | null => {
  const value = readValue(row, key);
  if (value === null) return null;
  if (typeof value === 'string') return value;
  throw new Error(`Expected nullable string SQLite value for ${key}.`);
};

export const readRequiredBytes = (row: SqliteRow, key: string): Uint8Array => {
  const value = readValue(row, key);
  if (value instanceof Uint8Array) return value;
  throw new Error(`Expected bytes SQLite value for ${key}.`);
};
