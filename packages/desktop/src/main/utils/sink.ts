import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { logPath } from '@main/application';

const maxEntries = 50;

let entries: string[] = [];
let pending: Promise<void> = Promise.resolve();
let directoryReady: Promise<unknown> | null = null;

export const tailEntries = (lines: string[], max: number) => (lines.length > max ? lines.slice(-max) : lines);

const flush = async () => {
  directoryReady ??= mkdir(dirname(logPath), { recursive: true });
  await directoryReady;
  await writeFile(logPath, `${entries.join('\n')}\n`, 'utf8');
};

export const recordError = (line: string) => {
  entries = tailEntries([...entries, line], maxEntries);
  pending = pending.then(flush).catch(() => {});
};
