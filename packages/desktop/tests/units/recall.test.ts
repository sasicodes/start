import type { QueuedMessage } from '@preload/index';
import { buildRecallList, recallNewer, recallOlder, sameOrder, userTurnTexts } from '@renderer/shared/chat/recall';
import type { Turn } from '@renderer/utils/types';
import { describe, expect, it } from 'vitest';

const userTurn = (id: string, text: string): Turn => ({ id, text, role: 'user', createdAt: 0 });
const assistantTurn = (id: string, text: string): Turn => ({ id, text, role: 'assistant', createdAt: 0 });
const queued = (id: string, text: string): QueuedMessage => ({ id, text, kind: 'followUp' });

const skillBlock = (body: string) =>
  `<skill name="simplify" location="/s/SKILL.md">\nRefs.\n\n${body}\n</skill>\n\nclean it up`;

describe('userTurnTexts', () => {
  it('returns user messages newest first, skipping non-user and empty', () => {
    const turns = [userTurn('1', 'first'), assistantTurn('2', 'reply'), userTurn('3', ''), userTurn('4', 'second')];
    expect(userTurnTexts(turns)).toEqual(['second', 'first']);
  });

  it('reconstructs the typed slash command for a skill turn', () => {
    expect(userTurnTexts([userTurn('1', skillBlock('body'))])).toEqual(['/skill:simplify clean it up']);
  });
});

describe('buildRecallList', () => {
  it('lists queued newest first, then user turns newest first', () => {
    const queue = [queued('q1', 'older queue'), queued('q2', 'newer queue')];
    const turns = [userTurn('1', 'first'), userTurn('2', 'second')];
    expect(buildRecallList(queue, userTurnTexts(turns))).toEqual(['newer queue', 'older queue', 'second', 'first']);
  });

  it('drops empty queued text', () => {
    expect(buildRecallList([queued('q1', '')], ['msg'])).toEqual(['msg']);
  });

  it('reconstructs a queued skill message into its slash command', () => {
    expect(buildRecallList([queued('q1', skillBlock('body'))], [])).toEqual(['/skill:simplify clean it up']);
  });
});

describe('sameOrder', () => {
  it('compares element by element', () => {
    expect(sameOrder(['a', 'b'], ['a', 'b'])).toBe(true);
    expect(sameOrder(['a'], ['a', 'b'])).toBe(false);
    expect(sameOrder(['a', 'b'], ['a', 'c'])).toBe(false);
  });
});

describe('recallOlder', () => {
  const entries = ['newest', 'middle', 'oldest'];

  it('advances toward older entries', () => {
    expect(recallOlder(entries, -1)).toEqual({ index: 0, text: 'newest' });
    expect(recallOlder(entries, 0)).toEqual({ index: 1, text: 'middle' });
    expect(recallOlder(entries, 1)).toEqual({ index: 2, text: 'oldest' });
  });

  it('stops at the first message', () => {
    expect(recallOlder(entries, 2)).toBeNull();
    expect(recallOlder([], -1)).toBeNull();
  });
});

describe('recallNewer', () => {
  const entries = ['newest', 'middle', 'oldest'];

  it('moves toward newer entries and clears at the end', () => {
    expect(recallNewer(entries, 2)).toEqual({ index: 1, text: 'middle' });
    expect(recallNewer(entries, 1)).toEqual({ index: 0, text: 'newest' });
    expect(recallNewer(entries, 0)).toEqual({ index: -1, text: '' });
  });

  it('does nothing when not recalling', () => {
    expect(recallNewer(entries, -1)).toBeNull();
  });
});
