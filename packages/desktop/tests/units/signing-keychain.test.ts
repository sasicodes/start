import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { expect, it, vi } from 'vitest';

interface SigningOptions {
  tmpDir: object;
  cscLink: string;
  cscILink: string;
  currentDir: string;
  cscKeyPassword: string;
  cscIKeyPassword: string;
}

it.each(['certificate-password', ''])(
  'uses the keychain password separately from certificate password %s',
  async (password) => {
    const desktopRequire = createRequire(import.meta.url);
    const builderRequire = createRequire(desktopRequire.resolve('electron-builder'));
    const signingPath = builderRequire.resolve('app-builder-lib/out/codeSign/macCodeSign');
    const signingRequire = createRequire(signingPath);
    const signing: { createKeychain?: (options: SigningOptions) => Promise<{ keychainFile: string }> } = {};
    let keychainPassword = '';
    const commands: string[][] = [];
    const exec = vi.fn(async (file: string, args: string[]) => {
      expect(file).toBe('/usr/bin/security');
      commands.push(args);
      if (args[0] === 'create-keychain') keychainPassword = args[2] ?? '';
      if (args[0] === 'set-key-partition-list' && args[5] !== keychainPassword) {
        throw new Error('Incorrect keychain password.');
      }
      return '';
    });

    runInNewContext(readFileSync(signingPath, 'utf8'), {
      exports: signing,
      process: { env: { TRAVIS: 'true' } },
      require: (id: string): unknown => {
        if (id === 'builder-util') return { exec };
        if (id === './codesign') return { importCertificate: async (link: string) => link };
        return signingRequire(id);
      }
    });
    if (!signing.createKeychain) throw new Error('Missing createKeychain export.');

    await signing.createKeychain({
      tmpDir: {},
      cscKeyPassword: password,
      currentDir: '/tmp/start-signing-test',
      cscLink: '/tmp/app-certificate.p12',
      cscIKeyPassword: 'installer-password',
      cscILink: '/tmp/installer-certificate.p12'
    });

    expect(keychainPassword).not.toBe('');
    const imports = commands.filter((args) => args[0] === 'import');
    expect(imports.map((args) => args[args.indexOf('-P') + 1])).toEqual([password, 'installer-password']);
    const partitions = commands.filter((args) => args[0] === 'set-key-partition-list');
    expect(partitions.map((args) => args[5])).toEqual([keychainPassword, keychainPassword]);
  }
);
