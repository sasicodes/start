import { appendTurnDetails, appendTurnThinking } from '@renderer/shared/turn/state';
import { detailMetric } from '@renderer/shared/turn/sequence';
import { thinkingMarkdown } from '@renderer/shared/turn/thinking';
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

const detailItem = (item: TurnActivityItem | undefined) => {
  if (!item || item.type !== 'detail') throw new Error('expected detail item');
  return item.detail;
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

const subagentDetailWithCount = (count: number) => ({
  ...detailWithCount(count),
  metric: '3 agents',
  subagents: [
    {
      id: 'agent-1',
      name: 'Marisol',
      task: 'Review activity UI',
      avatar: 'data:image/svg+xml;utf8,<svg/>',
      status: 'completed' as const,
      accentColor: '#0f766e'
    }
  ]
});

describe('turn activity sequence', () => {
  it('omits trailing metrics for sub-agent event titles', () => {
    expect(detailMetric({ ...detailWithCount(1), metric: '3 lines' })).toBe('3 lines');
    expect(detailMetric(subagentDetailWithCount(3))).toBe('');
  });

  it('normalizes bold thinking titles into compact headings', () => {
    expect(thinkingMarkdown('**Reviewing files**\nI need context.\n**Summarizing**\nDone.')).toBe(
      '### Reviewing files\nI need context.\n### Summarizing\nDone.'
    );
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

  it('keeps repeated browser event titles clean while preserving count metadata', () => {
    let turns: Turn[] = [baseTurn()];
    const setTurns = (fn: (current: Turn[]) => Turn[]) => {
      turns = fn(turns);
    };

    appendTurnDetails(setTurns, 't1', [toolEvent('browser_snapshot', 'Reading Browser', 'active')]);
    appendTurnDetails(setTurns, 't1', [toolEvent('browser_snapshot', 'Read Browser')]);

    const detail = detailItem(turns[0]?.activityItems?.[0]);
    expect(detail.title).toBe('Read Browser');
    expect(detail.count).toBe(2);
    expect(detail.title).not.toContain('×');
  });
});
