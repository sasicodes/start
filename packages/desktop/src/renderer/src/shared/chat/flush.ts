interface DeferredFlushTimers {
  delayMs: number;
  clearTimeout: (id: number) => void;
  setTimeout: (callback: () => void, delayMs: number) => number;
}

interface DeferredFlush {
  cancel: () => void;
  flushNow: () => void;
  schedule: () => void;
}

export const createDeferredFlush = (flush: () => void, timers: DeferredFlushTimers): DeferredFlush => {
  let timer = 0;

  const cancel = () => {
    if (!timer) return;

    timers.clearTimeout(timer);
    timer = 0;
  };

  const flushNow = () => {
    cancel();
    flush();
  };

  const schedule = () => {
    if (timer) return;

    timer = timers.setTimeout(() => {
      timer = 0;
      flush();
    }, timers.delayMs);
  };

  return { cancel, flushNow, schedule };
};
