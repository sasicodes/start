import { drainStreamBuffer, type StreamEvent } from '@renderer/shared/chat/stream-buffer';
import type { ChatEvent } from '@preload/index';
import { describe, expect, it, vi } from 'vitest';

const detail = (key: string): ChatEvent => ({ key, title: key, kind: 'tool', state: 'done' });

describe('drainStreamBuffer', () => {
  it('preserves chronological order across thinking and detail boundaries', () => {
    const calls: string[] = [];
    const events: StreamEvent[] = [
      { kind: 'thinking', delta: 'A' },
      { kind: 'detail', event: detail('read') },
      { kind: 'thinking', delta: 'B' },
      { kind: 'detail', event: detail('edit') },
      { kind: 'thinking', delta: 'C' }
    ];

    drainStreamBuffer(events, {
      onThinking: (delta) => calls.push(`thinking:${delta}`),
      onDetails: (batch) => calls.push(`details:${batch.map((event) => event.key).join(',')}`)
    });

    expect(calls).toEqual(['thinking:A', 'details:read', 'thinking:B', 'details:edit', 'thinking:C']);
  });

  it('coalesces consecutive thinking deltas into one call', () => {
    const calls: string[] = [];
    const events: StreamEvent[] = [
      { kind: 'thinking', delta: 'hello ' },
      { kind: 'thinking', delta: 'there ' },
      { kind: 'thinking', delta: 'world' }
    ];

    drainStreamBuffer(events, {
      onThinking: (delta) => calls.push(`thinking:${delta}`),
      onDetails: () => calls.push('details')
    });

    expect(calls).toEqual(['thinking:hello there world']);
  });

  it('coalesces consecutive detail events into one batch', () => {
    const onDetails = vi.fn();
    const events: StreamEvent[] = [
      { kind: 'detail', event: detail('a') },
      { kind: 'detail', event: detail('b') },
      { kind: 'detail', event: detail('c') }
    ];

    drainStreamBuffer(events, {
      onThinking: () => {},
      onDetails
    });

    expect(onDetails).toHaveBeenCalledTimes(1);
    expect(onDetails.mock.calls[0]?.[0].map((event: ChatEvent) => event.key)).toEqual(['a', 'b', 'c']);
  });

  it('splits when the boundary type flips back', () => {
    const calls: string[] = [];
    const events: StreamEvent[] = [
      { kind: 'detail', event: detail('a') },
      { kind: 'detail', event: detail('b') },
      { kind: 'thinking', delta: 'mid' },
      { kind: 'detail', event: detail('c') }
    ];

    drainStreamBuffer(events, {
      onThinking: (delta) => calls.push(`thinking:${delta}`),
      onDetails: (batch) => calls.push(`details:${batch.map((event) => event.key).join(',')}`)
    });

    expect(calls).toEqual(['details:a,b', 'thinking:mid', 'details:c']);
  });

  it('does nothing for an empty buffer', () => {
    const onThinking = vi.fn();
    const onDetails = vi.fn();

    drainStreamBuffer([], { onThinking, onDetails });

    expect(onThinking).not.toHaveBeenCalled();
    expect(onDetails).not.toHaveBeenCalled();
  });

  it('skips empty thinking deltas without losing surrounding order', () => {
    const calls: string[] = [];
    const events: StreamEvent[] = [
      { kind: 'thinking', delta: '' },
      { kind: 'detail', event: detail('only') }
    ];

    drainStreamBuffer(events, {
      onThinking: (delta) => calls.push(`thinking:${delta}`),
      onDetails: (batch) => calls.push(`details:${batch.map((event) => event.key).join(',')}`)
    });

    expect(calls).toEqual(['details:only']);
  });
});
