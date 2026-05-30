import electron from 'electron';

const { app, safeStorage } = electron;

export interface SecretCodec {
  available: () => boolean;
  encode: (plain: string) => Buffer;
  decode: (cipher: Uint8Array) => string;
}

const safeStorageCodec: SecretCodec = {
  available: () => safeStorage.isEncryptionAvailable(),
  encode: (plain) => safeStorage.encryptString(plain),
  decode: (cipher) => safeStorage.decryptString(Buffer.from(cipher))
};

const plaintextCodec: SecretCodec = {
  available: () => true,
  encode: (plain) => Buffer.from(plain, 'utf8'),
  decode: (cipher) => Buffer.from(cipher).toString('utf8')
};

export const resolveSecretCodec = (): SecretCodec => (app.isPackaged ? safeStorageCodec : plaintextCodec);
