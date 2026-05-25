import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { baseDir } from '@main/application';

const dbPath = () => join(baseDir, 'state.db');

const migrations = [
  `CREATE TABLE app_state (
     key        TEXT PRIMARY KEY,
     value_json TEXT NOT NULL,
     updated_at INTEGER NOT NULL
   )`,
  `CREATE TABLE auth (
     provider   TEXT PRIMARY KEY,
     ciphertext BLOB NOT NULL,
     updated_at INTEGER NOT NULL
   )`,
  `CREATE TABLE sessions (
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
   CREATE INDEX idx_sessions_cwd      ON sessions(cwd, updated_at DESC) WHERE archived = 0;
   CREATE INDEX idx_sessions_updated  ON sessions(updated_at DESC)      WHERE archived = 0;
   CREATE INDEX idx_sessions_archived ON sessions(archived, updated_at DESC)`
] as const;

const applyPragmas = (db: Database.Database) => {
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('mmap_size = 268435456');
  db.pragma('cache_size = -64000');
  db.pragma('temp_store = MEMORY');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
};

const applyMigrations = (db: Database.Database) => {
  db.exec('CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY)');
  const row = db.prepare('SELECT version FROM schema_version').get() as { version: number } | undefined;
  const current = row?.version ?? 0;

  const apply = db.transaction((from: number) => {
    for (const migration of migrations.slice(from)) {
      db.exec(migration);
    }
    db.prepare('DELETE FROM schema_version').run();
    db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(migrations.length);
  });

  if (current < migrations.length) apply(current);
};

let cachedDb: Database.Database | undefined;

export const openStartDb = (): Database.Database => {
  if (cachedDb) return cachedDb;
  mkdirSync(baseDir, { recursive: true });
  const db = new Database(dbPath());
  applyPragmas(db);
  applyMigrations(db);
  cachedDb = db;
  return db;
};

export const closeStartDb = () => {
  cachedDb?.pragma('optimize');
  cachedDb?.close();
  cachedDb = undefined;
};
