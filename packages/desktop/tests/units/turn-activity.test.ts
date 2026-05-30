import { appendTurnDetails, appendTurnThinking } from '@renderer/shared/turn/state';
import { detailCount } from '@renderer/shared/turn/sequence';
import type { Turn, TurnActivityItem } from '@renderer/utils/types';
import type { ChatEvent } from '@preload/index';
import { describe, expect, it } from 'vitest';

const baseTurn = (): Turn => ({
  id: 't1',
  text: '',
  role: 'assistant',
  createdAt: 0
});

const toolEvent = (key: string, title: string, state: ChatEvent['state'] = 'done'): ChatEvent => ({
  key,
  title,
  kind: 'tool',
  state
});

const thinkingText = (item: TurnActivityItem | undefined) => {
  if (!item || item.type !== 'thinking') throw new Error('expected thinking item');
  return item.text;
};

const detailKey = (item: TurnActivityItem | undefined) => {
  if (!item || item.type !== 'detail') throw new Error('expected detail item');
  return item.detail.key;
};

const detailState = (item: TurnActivityItem | undefined) => {
  if (!item || item.type !== 'detail') throw new Error('expected detail item');
  return item.detail.state;
};

const detailWithCount = (count: number) => ({
  id: 'read',
  key: 'read',
  count,
  kind: 'tool' as const,
  state: 'done' as const,
  title: 'Read',
  createdAt: 0,
  updatedAt: 0
});

describe('turn activity sequence', () => {
  it('formats repeat counts only for grouped events', () => {
    expect(detailCount(detailWithCount(1))).toBe('');
    expect(detailCount(detailWithCount(3))).toBe(' ×3');
  });

  it('interleaves thinking and detail items in arrival order', () => {
    let turns: Turn[] = [baseTurn()];
    const setTurns = (fn: (current: Turn[]) => Turn[]) => {
      turns = fn(turns);
    };

    appendTurnThinking(setTurns, 't1', 'first thought');
    appendTurnDetails(setTurns, 't1', [toolEvent('read', 'Read file.ts')]);
    appendTurnThinking(setTurns, 't1', 'second thought');
    appendTurnDetails(setTurns, 't1', [toolEvent('edit', 'Edit file.ts')]);
    appendTurnThinking(setTurns, 't1', 'third thought');

    const items = turns[0]?.activityItems ?? [];
    expect(items.map((item) => item.type)).toEqual(['thinking', 'detail', 'thinking', 'detail', 'thinking']);
    expect(thinkingText(items[0])).toBe('first thought');
    expect(thinkingText(items[2])).toBe('second thought');
    expect(thinkingText(items[4])).toBe('third thought');
    expect(detailKey(items[1])).toBe('read');
    expect(detailKey(items[3])).toBe('edit');
  });

  it('merges consecutive thinking deltas into one item', () => {
    let turns: Turn[] = [baseTurn()];
    const setTurns = (fn: (current: Turn[]) => Turn[]) => {
      turns = fn(turns);
    };

    appendTurnThinking(setTurns, 't1', 'hello ');
    appendTurnThinking(setTurns, 't1', 'world');

    const items = turns[0]?.activityItems ?? [];
    expect(items).toHaveLength(1);
    expect(thinkingText(items[0])).toBe('hello world');
  });

  it('starts a new thinking item when a detail interrupts the stream', () => {
    let turns: Turn[] = [baseTurn()];
    const setTurns = (fn: (current: Turn[]) => Turn[]) => {
      turns = fn(turns);
    };

    appendTurnThinking(setTurns, 't1', 'before');
    appendTurnDetails(setTurns, 't1', [toolEvent('read', 'Read file.ts')]);
    appendTurnThinking(setTurns, 't1', 'after');

    const items = turns[0]?.activityItems ?? [];
    expect(items.map((item) => item.type)).toEqual(['thinking', 'detail', 'thinking']);
    expect(thinkingText(items[2])).toBe('after');
  });

  it('merges incoming detail events into the existing active item by key', () => {
    let turns: Turn[] = [baseTurn()];
    const setTurns = (fn: (current: Turn[]) => Turn[]) => {
      turns = fn(turns);
    };

    appendTurnDetails(setTurns, 't1', [toolEvent('read', 'Reading', 'active')]);
    appendTurnDetails(setTurns, 't1', [toolEvent('read', 'Read', 'done')]);
    appendTurnDetails(setTurns, 't1', [toolEvent('read', 'Reading again', 'active')]);

    const items = turns[0]?.activityItems ?? [];
    expect(items.map((item) => item.type)).toEqual(['detail', 'detail']);
    expect(detailState(items[0])).toBe('done');
    expect(detailState(items[1])).toBe('active');
  });
});
