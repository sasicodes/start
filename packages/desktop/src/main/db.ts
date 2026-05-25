import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync, type StatementSync } from 'node:sqlite';
import { baseDir } from '@main/application';

export type StartDatabase = DatabaseSync;
export type StartStatement = StatementSync;

const dbPath = () => join(baseDir, 'state.db');

const schema = `CREATE TABLE IF NOT EXISTS app_state (
     key        TEXT PRIMARY KEY,
     value_json TEXT NOT NULL,
     updated_at INTEGER NOT NULL
   );
   CREATE TABLE IF NOT EXISTS auth (
     provider   TEXT PRIMARY KEY,
     ciphertext BLOB NOT NULL,
     updated_at INTEGER NOT NULL
   );
   CREATE TABLE IF NOT EXISTS sessions (
     id                   TEXT    PRIMARY KEY,
     path                 TEXT    NOT NULL,
     cwd                  TEXT    NOT NULL,
     title                TEXT,
     model_provider       TEXT,
     model_id             TEXT,
     thinking_level       TEXT,
     total_input_tokens   INTEGER NOT NULL DEFAULT 0,
     total_output_tokens  INTEGER NOT NULL DEFAULT 0,
     archived             INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0, 1)),
     archived_at          INTEGER,
     app_version          TEXT,
     created_at           INTEGER NOT NULL,
     updated_at           INTEGER NOT NULL
   );
   CREATE INDEX IF NOT EXISTS idx_sessions_cwd      ON sessions(cwd, updated_at DESC) WHERE archived = 0;
   CREATE INDEX IF NOT EXISTS idx_sessions_updated  ON sessions(updated_at DESC)      WHERE archived = 0;
   CREATE INDEX IF NOT EXISTS idx_sessions_archived ON sessions(archived, updated_at DESC)`;

const applyPragmas = (db: StartDatabase) => {
  db.exec(`PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA mmap_size = 268435456;
    PRAGMA cache_size = -64000;
    PRAGMA temp_store = MEMORY;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000`);
};

let cachedDb: StartDatabase | null = null;

export const openStartDb = (): StartDatabase => {
  if (cachedDb) return cachedDb;
  mkdirSync(baseDir, { recursive: true });
  const db = new DatabaseSync(dbPath());
  applyPragmas(db);
  db.exec(schema);
  cachedDb = db;
  return db;
};

export const runStartTransaction = <T>(run: () => T): T => {
  const db = openStartDb();
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = run();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
};

export const closeStartDb = () => {
  cachedDb?.exec('PRAGMA optimize');
  cachedDb?.close();
  cachedDb = null;
};
