import { combineHistoryTurns } from '@main/history/combine';
import type { HistoryTurn, HistoryTurnDetail } from '@main/types';
import { describe, expect, it } from 'vitest';

const detail = (id: string): HistoryTurnDetail => ({
  id,
  key: id,
  count: 1,
  title: id,
  kind: 'tool',
  state: 'done',
  createdAt: 1,
  updatedAt: 1
});

const turn = (id: string, role: HistoryTurn['role'], extras: Partial<HistoryTurn> = {}): HistoryTurn => ({
  id,
  role,
  text: '',
  createdAt: 1,
  ...extras
});

describe('combineHistoryTurns', () => {
  it('preserves detail order across event, terminal, and empty assistant turns without changing inputs', () => {
    const turns = [
      turn('event', 'event', { details: [detail('first'), detail('second')] }),
      turn('terminal', 'terminal', { details: [detail('third')] }),
      turn('thinking', 'assistant', { thinking: 'plan', details: [detail('fourth')] }),
      turn('answer', 'assistant', { text: 'done', details: [detail('answer')] })
    ];
    const original = structuredClone(turns);

    for (const item of turns) {
      if (item.details) Object.freeze(item.details);
      Object.freeze(item);
    }
    Object.freeze(turns);

    expect(combineHistoryTurns(turns)).toEqual([
      turn('answer', 'assistant', {
        text: 'done',
        thinking: 'plan',
        details: ['answer', 'first', 'second', 'third', 'fourth'].map(detail)
      })
    ]);
    expect(turns).toEqual(original);
  });

  it('keeps emitted pending groups separate when more details follow', () => {
    const turns = combineHistoryTurns([
      turn('user', 'user', { text: 'start' }),
      turn('first', 'event', { details: [detail('first')] }),
      turn('next', 'user', { text: 'continue' }),
      turn('second', 'event', { details: [detail('second')] }),
      turn('output', 'terminal', { text: 'output' }),
      turn('third', 'event', { details: [detail('third')] })
    ]);

    expect(turns.map(({ details }) => details?.map(({ id }) => id) ?? [])).toEqual([
      [],
      ['first'],
      [],
      ['second'],
      [],
      ['third']
    ]);
  });

  it('discards pending work before the first user turn', () => {
    const user = turn('user', 'user', { text: 'start' });

    expect(combineHistoryTurns([turn('old', 'event', { details: [detail('old')] }), user])).toEqual([user]);
  });

  it('preserves every detail in a large tool history', () => {
    const details = Array.from({ length: 10_000 }, (_, index) => detail(String(index)));
    const turns = details.map((item) => turn(item.id, 'event', { details: [item] }));
    turns.push(turn('answer', 'assistant', { text: 'done' }));

    expect(combineHistoryTurns(turns)).toEqual([turn('answer', 'assistant', { text: 'done', details })]);
  });
});
