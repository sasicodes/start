import { createSearchLimiter } from '@main/providers/tools/search/limiter';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('search limiter', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs at most the configured number of tasks at once, in order', async () => {
    const limiter = createSearchLimiter(2, 0);
    const started: number[] = [];
    const releases: (() => void)[] = [];
    let running = 0;
    let peak = 0;
    const task = (id: number) => () => {
      started.push(id);
      running += 1;
      peak = Math.max(peak, running);
      return new Promise<number>((resolve) => {
        releases.push(() => {
          running -= 1;
          resolve(id);
        });
      });
    };

    const results = Promise.all([
      limiter.run(null, task(1)),
      limiter.run(null, task(2)),
      limiter.run(null, task(3)),
      limiter.run(null, task(4))
    ]);

    expect(started).toEqual([1, 2]);
    releases[0]?.();
    releases[1]?.();
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
    expect(started).toEqual([1, 2, 3, 4]);

    releases[2]?.();
    releases[3]?.();
    await expect(results).resolves.toEqual([1, 2, 3, 4]);
    expect(peak).toBe(2);
  });

  it('spaces task starts by the configured interval', async () => {
    vi.useFakeTimers();
    const limiter = createSearchLimiter(3, 400);
    const begin = Date.now();
    const starts: number[] = [];
    const task = async () => {
      starts.push(Date.now() - begin);
    };

    const all = Promise.all([limiter.run(null, task), limiter.run(null, task), limiter.run(null, task)]);

    expect(starts).toEqual([0]);
    await vi.advanceTimersByTimeAsync(400);
    expect(starts).toEqual([0, 400]);
    await vi.advanceTimersByTimeAsync(400);
    expect(starts).toEqual([0, 400, 800]);
    await all;
  });

  it('rejects queued tasks promptly when their signal aborts', async () => {
    const limiter = createSearchLimiter(1, 0);
    const controller = new AbortController();
    let release = () => {};
    let queuedRan = false;
    let laterRan = false;

    const blocked = limiter.run(
      null,
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        })
    );
    const queued = limiter.run(controller.signal, async () => {
      queuedRan = true;
    });
    const later = limiter.run(null, async () => {
      laterRan = true;
    });

    const rejection = expect(queued).rejects.toThrow('Web search cancelled.');
    controller.abort();
    await rejection;
    expect(queuedRan).toBe(false);
    expect(laterRan).toBe(false);

    release();
    await Promise.all([blocked, later]);
    expect(laterRan).toBe(true);
  });

  it('aborts a task waiting on its spacing delay', async () => {
    vi.useFakeTimers();
    const limiter = createSearchLimiter(2, 400);
    const controller = new AbortController();
    let ran = false;

    const first = limiter.run(null, async () => {});
    const second = limiter.run(controller.signal, async () => {
      ran = true;
    });

    const rejection = expect(second).rejects.toThrow('Web search cancelled.');
    controller.abort();
    await rejection;

    expect(ran).toBe(false);
    await first;
  });

  it('rejects immediately when the signal is already aborted', async () => {
    const limiter = createSearchLimiter(2, 0);
    const controller = new AbortController();
    controller.abort();

    await expect(limiter.run(controller.signal, async () => 'unreachable')).rejects.toThrow('Web search cancelled.');
  });
});
