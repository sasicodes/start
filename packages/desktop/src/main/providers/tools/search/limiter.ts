import { abortableSleep, searchCancelledError } from '@main/providers/tools/search/fetcher';

interface QueueEntry {
  start: () => void;
  cancel: () => void;
}

export interface SearchLimiter {
  run: <T>(signal: AbortSignal | null, task: () => Promise<T>) => Promise<T>;
}

export const createSearchLimiter = (concurrency: number, spacingMs: number): SearchLimiter => {
  let active = 0;
  let nextSlotAt = 0;
  const queue: QueueEntry[] = [];

  const drain = () => {
    while (active < concurrency) {
      const entry = queue.shift();
      if (!entry) return;
      active += 1;
      entry.start();
    }
  };

  const run = <T>(signal: AbortSignal | null, task: () => Promise<T>) =>
    new Promise<T>((resolve, reject) => {
      if (signal?.aborted) {
        reject(searchCancelledError());
        return;
      }

      const entry: QueueEntry = {
        cancel: () => {
          const index = queue.indexOf(entry);
          if (index >= 0) queue.splice(index, 1);
          reject(searchCancelledError());
        },
        start: () => {
          signal?.removeEventListener('abort', entry.cancel);
          const slotAt = Math.max(Date.now(), nextSlotAt);
          nextSlotAt = slotAt + spacingMs;

          const execute = async () => {
            try {
              const wait = slotAt - Date.now();
              if (wait > 0) await abortableSleep(wait, signal);
              resolve(await task());
            } catch (error) {
              reject(error);
            } finally {
              active -= 1;
              drain();
            }
          };
          execute();
        }
      };

      signal?.addEventListener('abort', entry.cancel, { once: true });
      queue.push(entry);
      drain();
    });

  return { run };
};
