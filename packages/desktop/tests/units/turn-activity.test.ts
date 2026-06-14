import type { ChatEvent } from '@preload/index';
import { activityLabelParts } from '@renderer/shared/turn/label';
import { detailMetric, turnActionText } from '@renderer/shared/turn/sequence';
import { appendTurnDetails, appendTurnThinking } from '@renderer/shared/turn/state';
import { thinkingMarkdown } from '@renderer/shared/turn/thinking';
import { readTurns, replaceTurns } from '@renderer/state/chat';
import type { Turn, TurnActivityItem } from '@renderer/utils/types';
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
  if (item?.type !== 'thinking') throw new Error('expected thinking item');
  return item.text;
};

const detailKey = (item: TurnActivityItem | undefined) => {
  if (item?.type !== 'detail') throw new Error('expected detail item');
  return item.detail.key;
};

const detailState = (item: TurnActivityItem | undefined) => {
  if (item?.type !== 'detail') throw new Error('expected detail item');
  return item.detail.state;
};

const detailTitle = (item: TurnActivityItem | undefined) => {
  if (item?.type !== 'detail') throw new Error('expected detail item');
  return item.detail.title;
};

const detailItem = (item: TurnActivityItem | undefined) => {
  if (item?.type !== 'detail') throw new Error('expected detail item');
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

const resetTurns = () => replaceTurns([baseTurn()]);

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

  it('separates the activity duration for tabular rendering', () => {
    expect(activityLabelParts({ createdAt: 1000, details: [], now: 46_000, working: true })).toEqual({
      duration: '45s',
      verb: 'Working'
    });
  });

  it('shows one action footer for split assistant text turns', () => {
    const turns: Turn[] = [
      { id: 'user', text: 'review this', role: 'user', createdAt: 0 },
      { id: 'a1', text: 'First response.', role: 'assistant', createdAt: 1 },
      { id: 'a2', text: '', role: 'assistant', createdAt: 2, details: [detailWithCount(1)] },
      { id: 'a3', text: 'Final response.', role: 'assistant', createdAt: 3 },
      { id: 'next', text: 'thanks', role: 'user', createdAt: 4 }
    ];

    expect(turnActionText(turns, 1)).toBe('');
    expect(turnActionText(turns, 2)).toBe('');
    expect(turnActionText(turns, 3)).toBe('First response.\n\nFinal response.');
    expect(turnActionText(turns, 4)).toBe('thanks');

    const activeTurns: Turn[] = [
      { id: 'user', text: 'review this', role: 'user', createdAt: 0 },
      { id: 'a1', text: 'First response.', role: 'assistant', createdAt: 1 },
      { id: 'a2', text: '', role: 'assistant', createdAt: 2, details: [detailWithCount(1)], streaming: true }
    ];

    expect(turnActionText(activeTurns, 1)).toBe('');
    expect(turnActionText(activeTurns, 2)).toBe('First response.');
  });

  it('derives action text from current turns without storing it in render props', () => {
    const turns: Turn[] = [
      { id: 'user', text: 'review this', role: 'user', createdAt: 0 },
      { id: 'a1', text: 'First response.', role: 'assistant', createdAt: 1 },
      { id: 'a2', text: '', role: 'assistant', createdAt: 2, details: [detailWithCount(1)] },
      { id: 'a3', text: 'Final response.', role: 'assistant', createdAt: 3 },
      { id: 'next', text: 'thanks', role: 'user', createdAt: 4 }
    ];
    replaceTurns(turns);

    expect(turnActionText(readTurns(), 1)).toBe('');
    expect(turnActionText(readTurns(), 2)).toBe('');
    expect(turnActionText(readTurns(), 3)).toBe('First response.\n\nFinal response.');
    expect(turnActionText(readTurns(), 4)).toBe('thanks');
  });

  it('interleaves thinking and detail items in arrival order', () => {
    resetTurns();

    appendTurnThinking('t1', 'first thought');
    appendTurnDetails('t1', [toolEvent('read', 'Read file.ts')]);
    appendTurnThinking('t1', 'second thought');
    appendTurnDetails('t1', [toolEvent('edit', 'Edit file.ts')]);
    appendTurnThinking('t1', 'third thought');

    const items = readTurns()[0]?.activityItems ?? [];
    expect(items.map((item) => item.type)).toEqual(['thinking', 'detail', 'thinking', 'detail', 'thinking']);
    expect(thinkingText(items[0])).toBe('first thought');
    expect(thinkingText(items[2])).toBe('second thought');
    expect(thinkingText(items[4])).toBe('third thought');
    expect(detailKey(items[1])).toBe('read');
    expect(detailKey(items[3])).toBe('edit');
  });

  it('merges consecutive thinking deltas into one item', () => {
    resetTurns();

    appendTurnThinking('t1', 'hello ');
    appendTurnThinking('t1', 'world');

    const items = readTurns()[0]?.activityItems ?? [];
    expect(items).toHaveLength(1);
    expect(thinkingText(items[0])).toBe('hello world');
  });

  it('starts a new thinking item when a detail interrupts the stream', () => {
    resetTurns();

    appendTurnThinking('t1', 'before');
    appendTurnDetails('t1', [toolEvent('read', 'Read file.ts')]);
    appendTurnThinking('t1', 'after');

    const items = readTurns()[0]?.activityItems ?? [];
    expect(items.map((item) => item.type)).toEqual(['thinking', 'detail', 'thinking']);
    expect(thinkingText(items[2])).toBe('after');
  });

  it('merges incoming detail events into the existing active item by key', () => {
    resetTurns();

    appendTurnDetails('t1', [toolEvent('read', 'Reading', 'active')]);
    appendTurnDetails('t1', [toolEvent('read', 'Read', 'done')]);
    appendTurnDetails('t1', [toolEvent('read', 'Reading again', 'active')]);

    const items = readTurns()[0]?.activityItems ?? [];
    expect(items.map((item) => item.type)).toEqual(['detail', 'detail']);
    expect(detailState(items[0])).toBe('done');
    expect(detailState(items[1])).toBe('active');
  });

  it('hides superseded sub-agent failures when a retry starts', () => {
    resetTurns();

    appendTurnDetails('t1', [toolEvent('tool:first-subagent', 'Sub-agents failed', 'error')]);
    appendTurnDetails('t1', [toolEvent('tool:second-subagent', 'Spawning 1 agent', 'active')]);

    const items = readTurns()[0]?.activityItems ?? [];
    expect(items).toHaveLength(1);
    expect(detailTitle(items[0])).toBe('Spawning 1 agent');
    expect(readTurns()[0]?.details).toHaveLength(1);
    expect(readTurns()[0]?.details?.[0]?.title).toBe('Spawning 1 agent');
  });

  it('keeps repeated browser event titles clean while preserving count metadata', () => {
    resetTurns();

    appendTurnDetails('t1', [toolEvent('browser_snapshot', 'Reading Browser', 'active')]);
    appendTurnDetails('t1', [toolEvent('browser_snapshot', 'Read Browser')]);

    const detail = detailItem(readTurns()[0]?.activityItems?.[0]);
    expect(detail.title).toBe('Read Browser');
    expect(detail.count).toBe(2);
    expect(detail.title).not.toContain('×');
  });
});
