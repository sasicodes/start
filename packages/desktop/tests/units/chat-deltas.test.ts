import { createDeltaCoalescer, type DeltaFlush } from '@main/chat/deltas';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('createDeltaCoalescer', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('coalesces pushed deltas into one flush after the interval', () => {
    const flushes: DeltaFlush[] = [];
    const coalescer = createDeltaCoalescer(50, (flushed) => flushes.push(flushed));

    coalescer.push('text', 'Hel', true);
    coalescer.push('text', 'lo', true);
    coalescer.push('thinking', 'hmm', false);
    expect(flushes).toEqual([]);

    vi.advanceTimersByTime(50);
    expect(flushes).toEqual([{ text: 'Hello', thinking: 'hmm', senderText: 'Hello', senderThinking: '' }]);
  });

  it('tracks sender deltas separately from scoped deltas', () => {
    const flushes: DeltaFlush[] = [];
    const coalescer = createDeltaCoalescer(50, (flushed) => flushes.push(flushed));

    coalescer.push('text', 'a', true);
    coalescer.push('text', 'b', false);
    coalescer.flush();

    expect(flushes).toEqual([{ text: 'ab', thinking: '', senderText: 'a', senderThinking: '' }]);
  });

  it('flushes pending deltas immediately on demand and cancels the timer', () => {
    const flushes: DeltaFlush[] = [];
    const coalescer = createDeltaCoalescer(50, (flushed) => flushes.push(flushed));

    coalescer.push('thinking', 'deep', true);
    coalescer.flush();
    expect(flushes).toEqual([{ text: '', thinking: 'deep', senderText: '', senderThinking: 'deep' }]);

    vi.advanceTimersByTime(100);
    expect(flushes).toHaveLength(1);
  });

  it('skips empty flushes and empty deltas', () => {
    const flushes: DeltaFlush[] = [];
    const coalescer = createDeltaCoalescer(50, (flushed) => flushes.push(flushed));

    coalescer.flush();
    coalescer.push('text', '', true);
    vi.advanceTimersByTime(100);
    expect(flushes).toEqual([]);
  });

  it('keeps accepting deltas after a flush', () => {
    const flushes: DeltaFlush[] = [];
    const coalescer = createDeltaCoalescer(50, (flushed) => flushes.push(flushed));

    coalescer.push('text', 'one', true);
    vi.advanceTimersByTime(50);
    coalescer.push('text', 'two', false);
    vi.advanceTimersByTime(50);

    expect(flushes).toEqual([
      { text: 'one', thinking: '', senderText: 'one', senderThinking: '' },
      { text: 'two', thinking: '', senderText: '', senderThinking: '' }
    ]);
  });
});
