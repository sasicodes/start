import type { AuthStorageBackend } from '@earendil-works/pi-coding-agent';
import type { StartDatabase } from '@main/db';
import { resolveSecretCodec, type SecretCodec } from '@main/providers/codec';
import { readRequiredBytes } from '@main/sqlite/row';

const allProvidersKey = '__all__';

interface LockResult<T> {
  next?: string;
  result: T;
}

class DbAuthBackend implements AuthStorageBackend {
  private asyncQueue: Promise<unknown> = Promise.resolve();
  private readonly codec: SecretCodec;
  private readonly readStmt;
  private readonly writeStmt;

  constructor(db: StartDatabase, codec: SecretCodec) {
    this.codec = codec;
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
    if (!this.codec.available()) return;
    const row = this.readStmt.get(allProvidersKey);
    if (!row) return;
    return this.codec.decode(readRequiredBytes(row, 'ciphertext'));
  }

  private persist(next: string) {
    if (!this.codec.available()) {
      throw new Error('Auth storage is not available; cannot persist credentials.');
    }
    this.writeStmt.run(allProvidersKey, this.codec.encode(next), Date.now());
  }
}

export const resolveAuthBackend = (db: StartDatabase): AuthStorageBackend =>
  new DbAuthBackend(db, resolveSecretCodec());
