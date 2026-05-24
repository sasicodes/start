import { readTurns, replaceTurns, turnIdsState, turnSignal, updateTurns } from '@renderer/state/chat';
import type { Turn } from '@renderer/utils/types';
import { describe, expect, it } from 'vitest';

const turn = (id: string, text: string): Turn => ({
  id,
  text,
  role: 'assistant',
  createdAt: 0
});

describe('renderer chat state', () => {
  it('replaces the active turn list and emits new id ordering', () => {
    replaceTurns([turn('a', 'A'), turn('b', 'B')]);
    expect(turnIdsState.value).toEqual(['a', 'b']);
    expect(readTurns().map((entry) => entry.id)).toEqual(['a', 'b']);
  });

  it('keeps existing turn signals for unchanged ids and adds new ones', () => {
    replaceTurns([turn('a', 'A')]);
    const original = turnSignal('a');
    replaceTurns([turn('a', 'A'), turn('c', 'C')]);
    expect(turnSignal('a')).toBe(original);
    expect(turnSignal('c')).toBeDefined();
  });

  it('removes signals for turns dropped on replace', () => {
    replaceTurns([turn('a', 'A'), turn('b', 'B')]);
    replaceTurns([turn('b', 'B')]);
    expect(turnSignal('a')).toBeUndefined();
    expect(turnSignal('b')).toBeDefined();
  });

  it('updates turns via a callback without mutating the previous array', () => {
    replaceTurns([turn('a', 'A')]);
    const previous = readTurns();
    updateTurns((current) => [...current, turn('b', 'B')]);
    expect(previous.map((entry) => entry.id)).toEqual(['a']);
    expect(readTurns().map((entry) => entry.id)).toEqual(['a', 'b']);
  });
});
