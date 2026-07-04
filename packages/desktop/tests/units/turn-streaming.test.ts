import { computed, effect } from '@preact/signals';
import {
  lastTurnStreaming as lastTurnStreamingValue,
  replaceTurns,
  turnIdsState,
  updateTurn
} from '@renderer/state/chat';
import type { Turn } from '@renderer/utils/types';
import { beforeEach, describe, expect, it } from 'vitest';

const turn = (id: string, overrides: Partial<Turn> = {}): Turn => ({
  id,
  text: '',
  createdAt: 0,
  role: 'assistant',
  ...overrides
});

const lastTurnStreaming = () => computed(lastTurnStreamingValue);

describe('last turn streaming computed', () => {
  beforeEach(() => {
    replaceTurns([]);
  });

  it('is false without turns', () => {
    expect(lastTurnStreaming().value).toBe(false);
  });

  it('is false when the last turn id has no signal', () => {
    turnIdsState.value = ['ghost'];
    expect(lastTurnStreaming().value).toBe(false);
  });

  it('tracks the streaming flag of the last turn', () => {
    const streaming = lastTurnStreaming();

    replaceTurns([turn('a'), turn('b', { streaming: true })]);
    expect(streaming.value).toBe(true);

    updateTurn('b', (current) => ({ ...current, streaming: false }));
    expect(streaming.value).toBe(false);
  });

  it('sees a turn appended in the same batch as its id', () => {
    replaceTurns([turn('a')]);
    const streaming = lastTurnStreaming();

    expect(streaming.value).toBe(false);
    replaceTurns([turn('a'), turn('b', { streaming: true })]);
    expect(streaming.value).toBe(true);
  });

  it('only notifies subscribers when the boolean flips', () => {
    replaceTurns([turn('a', { text: 'hi', streaming: true })]);
    const streaming = lastTurnStreaming();

    let runs = 0;
    let latest = false;
    const dispose = effect(() => {
      latest = streaming.value;
      runs += 1;
    });

    expect(runs).toBe(1);
    expect(latest).toBe(true);

    updateTurn('a', (current) => ({ ...current, text: 'hi there' }));
    updateTurn('a', (current) => ({ ...current, text: 'hi there, world' }));
    expect(runs).toBe(1);

    updateTurn('a', (current) => ({ ...current, streaming: false }));
    expect(runs).toBe(2);
    expect(latest).toBe(false);

    dispose();
  });
});
