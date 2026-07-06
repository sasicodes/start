import { createDeltaCoalescer, type DeltaChunk } from '@main/chat/deltas';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('createDeltaCoalescer', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('coalesces consecutive same-kind deltas into one chunk after the interval', () => {
    const flushes: DeltaChunk[][] = [];
    const coalescer = createDeltaCoalescer(50, (chunks) => flushes.push(chunks));

    coalescer.push('text', 'Hel', true);
    coalescer.push('text', 'lo', true);
    coalescer.push('thinking', 'hmm', false);
    expect(flushes).toEqual([]);

    vi.advanceTimersByTime(50);
    expect(flushes).toEqual([
      [
        { kind: 'text', delta: 'Hello', senderDelta: 'Hello' },
        { kind: 'thinking', delta: 'hmm', senderDelta: '' }
      ]
    ]);
  });

  it('preserves the interleaving order of thinking and text within one flush', () => {
    const flushes: DeltaChunk[][] = [];
    const coalescer = createDeltaCoalescer(50, (chunks) => flushes.push(chunks));

    coalescer.push('thinking', 'plan the answer', true);
    coalescer.push('text', 'Confirmed, ', true);
    coalescer.push('thinking', 'double-check', true);
    coalescer.push('text', 'done.', true);
    coalescer.flush();

    expect(flushes).toEqual([
      [
        { kind: 'thinking', delta: 'plan the answer', senderDelta: 'plan the answer' },
        { kind: 'text', delta: 'Confirmed, ', senderDelta: 'Confirmed, ' },
        { kind: 'thinking', delta: 'double-check', senderDelta: 'double-check' },
        { kind: 'text', delta: 'done.', senderDelta: 'done.' }
      ]
    ]);
  });

  it('tracks sender deltas separately from scoped deltas', () => {
    const flushes: DeltaChunk[][] = [];
    const coalescer = createDeltaCoalescer(50, (chunks) => flushes.push(chunks));

    coalescer.push('text', 'a', true);
    coalescer.push('text', 'b', false);
    coalescer.flush();

    expect(flushes).toEqual([[{ kind: 'text', delta: 'ab', senderDelta: 'a' }]]);
  });

  it('flushes pending deltas immediately on demand and cancels the timer', () => {
    const flushes: DeltaChunk[][] = [];
    const coalescer = createDeltaCoalescer(50, (chunks) => flushes.push(chunks));

    coalescer.push('thinking', 'deep', true);
    coalescer.flush();
    expect(flushes).toEqual([[{ kind: 'thinking', delta: 'deep', senderDelta: 'deep' }]]);

    vi.advanceTimersByTime(100);
    expect(flushes).toHaveLength(1);
  });

  it('skips empty flushes and empty deltas', () => {
    const flushes: DeltaChunk[][] = [];
    const coalescer = createDeltaCoalescer(50, (chunks) => flushes.push(chunks));

    coalescer.flush();
    coalescer.push('text', '', true);
    vi.advanceTimersByTime(100);
    expect(flushes).toEqual([]);
  });

  it('keeps accepting deltas after a flush', () => {
    const flushes: DeltaChunk[][] = [];
    const coalescer = createDeltaCoalescer(50, (chunks) => flushes.push(chunks));

    coalescer.push('text', 'one', true);
    vi.advanceTimersByTime(50);
    coalescer.push('text', 'two', false);
    vi.advanceTimersByTime(50);

    expect(flushes).toEqual([
      [{ kind: 'text', delta: 'one', senderDelta: 'one' }],
      [{ kind: 'text', delta: 'two', senderDelta: '' }]
    ]);
  });
});
