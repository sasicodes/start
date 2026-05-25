import type Database from 'better-sqlite3';
import electron from 'electron';
import type { AuthStorageBackend } from '@earendil-works/pi-coding-agent';

const { safeStorage } = electron;

const allProvidersKey = '__all__';

interface LockResult<T> {
  result: T;
  next?: string;
}

interface AuthRow {
  ciphertext: Buffer;
}

export class KeychainAuthBackend implements AuthStorageBackend {
  private readonly readStmt;
  private readonly writeStmt;
  private asyncQueue: Promise<unknown> = Promise.resolve();

  constructor(db: Database.Database) {
    this.readStmt = db.prepare('SELECT ciphertext FROM auth WHERE provider = ?');
    this.writeStmt = db.prepare(
      'INSERT INTO auth (provider, ciphertext, updated_at) VALUES (?, ?, ?) ON CONFLICT(provider) DO UPDATE SET ciphertext = excluded.ciphertext, updated_at = excluded.updated_at'
    );
  }

  withLock<T>(fn: (current: string | undefined) => LockResult<T>): T {
    const current = this.readCurrent();
    const { result, next } = fn(current);
    if (next !== undefined) this.persist(next);
    return result;
  }

  async withLockAsync<T>(fn: (current: string | undefined) => Promise<LockResult<T>>): Promise<T> {
    const run = async (): Promise<T> => {
      const current = this.readCurrent();
      const { result, next } = await fn(current);
      if (next !== undefined) this.persist(next);
      return result;
    };
    const pending = this.asyncQueue.then(run, run);
    this.asyncQueue = pending.catch(() => {});
    return pending;
  }

  private readCurrent(): string | undefined {
    if (!safeStorage.isEncryptionAvailable()) return;
    const row = this.readStmt.get(allProvidersKey) as AuthRow | undefined;
    if (!row) return;
    return safeStorage.decryptString(row.ciphertext);
  }

  private persist(next: string) {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('safeStorage encryption is not available; cannot persist credentials.');
    }
    const ciphertext = safeStorage.encryptString(next);
    this.writeStmt.run(allProvidersKey, ciphertext, Date.now());
  }
}
