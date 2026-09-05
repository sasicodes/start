import type { Credential, CredentialInfo, CredentialStore } from '@earendil-works/pi-ai';
import type { StartDatabase } from '@main/db';
import { resolveSecretCodec, type SecretCodec } from '@main/providers/codec';
import { readRequiredBytes } from '@main/sqlite/row';
import * as v from 'valibot';

const allProvidersKey = '__all__';

const apiKeyCredentialSchema = v.object({
  key: v.optional(v.string()),
  env: v.optional(v.record(v.string(), v.string())),
  type: v.literal('api_key')
});

const oauthCredentialSchema = v.looseObject({
  type: v.literal('oauth'),
  access: v.string(),
  expires: v.number(),
  refresh: v.string()
});

const credentialsSchema = v.record(v.string(), v.variant('type', [apiKeyCredentialSchema, oauthCredentialSchema]));

type StoredCredentials = Record<string, Credential>;

const parseCredentials = (content: string): StoredCredentials => {
  const parsed = v.parse(credentialsSchema, JSON.parse(content));
  return Object.fromEntries(
    Object.entries(parsed).map(([providerId, credential]) => [
      providerId,
      credential.type === 'api_key'
        ? {
            type: credential.type,
            ...(typeof credential.key === 'string' ? { key: credential.key } : {}),
            ...(credential.env ? { env: credential.env } : {})
          }
        : credential
    ])
  );
};

export class DbCredentialStore implements CredentialStore {
  private data: StoredCredentials = {};
  private queue: Promise<unknown> = Promise.resolve();
  private readonly codec: SecretCodec;
  private readonly readStmt;
  private readonly writeStmt;

  constructor(db: StartDatabase, codec: SecretCodec) {
    this.codec = codec;
    this.readStmt = db.prepare('SELECT ciphertext FROM auth WHERE provider = ?');
    this.writeStmt = db.prepare(
      'INSERT INTO auth (provider, ciphertext, updated_at) VALUES (?, ?, ?) ON CONFLICT(provider) DO UPDATE SET ciphertext = excluded.ciphertext, updated_at = excluded.updated_at'
    );
    this.reload();
  }

  reload(): void {
    try {
      this.data = this.readCurrent();
    } catch {}
  }

  async read(providerId: string): Promise<Credential | undefined> {
    return this.data[providerId];
  }

  async list(): Promise<readonly CredentialInfo[]> {
    return Object.entries(this.data).map(([providerId, credential]) => ({ providerId, type: credential.type }));
  }

  async modify(
    providerId: string,
    fn: (current: Credential | undefined) => Promise<Credential | undefined>
  ): Promise<Credential | undefined> {
    return this.enqueue(async () => {
      const current = this.readCurrent();
      const credential = await fn(current[providerId]);
      if (!credential) {
        this.data = current;
        return current[providerId];
      }

      const next = { ...current, [providerId]: credential };
      this.persist(next);
      this.data = next;
      return credential;
    });
  }

  async delete(providerId: string): Promise<void> {
    await this.enqueue(async () => {
      const next = this.readCurrent();
      delete next[providerId];
      this.persist(next);
      this.data = next;
    });
  }

  private enqueue<T>(run: () => Promise<T>): Promise<T> {
    const pending = this.queue.then(run, run);
    this.queue = pending.catch(() => {});
    return pending;
  }

  private readCurrent(): StoredCredentials {
    const row = this.readStmt.get(allProvidersKey);
    if (!row || !this.codec.available()) return {};
    return parseCredentials(this.codec.decode(readRequiredBytes(row, 'ciphertext')));
  }

  private persist(credentials: StoredCredentials): void {
    if (!this.codec.available()) throw new Error('Auth storage is not available; cannot persist credentials.');
    this.writeStmt.run(allProvidersKey, this.codec.encode(JSON.stringify(credentials, null, 2)), Date.now());
  }
}

export const resolveCredentialStore = (db: StartDatabase): DbCredentialStore =>
  new DbCredentialStore(db, resolveSecretCodec());
