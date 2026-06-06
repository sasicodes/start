import { createDeferredFlush } from '@renderer/shared/chat/flush';

const createTimers = () => {
  const delays: number[] = [];
  const cleared: number[] = [];
  const callbacks = new Map<number, () => void>();
  let nextId = 0;

  return {
    delays,
    cleared,
    callbacks,
    timers: {
      delayMs: 64,
      clearTimeout: (id: number) => {
        callbacks.delete(id);
        cleared.push(id);
      },
      setTimeout: (callback: () => void, delayMs: number) => {
        nextId += 1;
        delays.push(delayMs);
        callbacks.set(nextId, callback);
        return nextId;
      }
    }
  };
};

describe('deferred flush', () => {
  it('coalesces pending flushes into one timer', () => {
    const calls: string[] = [];
    const timers = createTimers();
    const flush = createDeferredFlush(() => calls.push('flush'), timers.timers);

    flush.schedule();
    flush.schedule();

    expect(timers.delays).toEqual([64]);
    expect(calls).toEqual([]);

    timers.callbacks.get(1)?.();
    flush.schedule();

    expect(calls).toEqual(['flush']);
    expect(timers.delays).toEqual([64, 64]);
  });

  it('flushes immediately and clears the pending timer', () => {
    const calls: string[] = [];
    const timers = createTimers();
    const flush = createDeferredFlush(() => calls.push('flush'), timers.timers);

    flush.schedule();
    flush.flushNow();

    expect(timers.cleared).toEqual([1]);
    expect(calls).toEqual(['flush']);
    expect(timers.callbacks.size).toBe(0);
  });

  it('cancels a pending flush', () => {
    const calls: string[] = [];
    const timers = createTimers();
    const flush = createDeferredFlush(() => calls.push('flush'), timers.timers);

    flush.schedule();
    flush.cancel();

    expect(timers.cleared).toEqual([1]);
    expect(calls).toEqual([]);
    expect(timers.callbacks.size).toBe(0);
  });
});
