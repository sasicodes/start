import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { startDir } from '@main/storage';

const localStatePath = (name: string) => join(startDir(), name);

export const readLocalStateValue = (name: string) => {
  try {
    return readFileSync(localStatePath(name), 'utf8').trim();
  } catch {
    return;
  }
};

export const writeLocalStateValue = (name: string, value: string) => {
  try {
    const path = localStatePath(name);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, value, 'utf8');
  } catch {
    return;
  }
};
