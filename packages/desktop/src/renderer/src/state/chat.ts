import { batch, signal, untracked, type Signal } from '@preact/signals';
import type { Turn } from '@renderer/utils/types';

export const selectedModelKeyState = signal('');
export const contextPercentState = signal(0);
export const turnIdsState = signal<string[]>([]);

const turnSignals = new Map<string, Signal<Turn>>();

const sameIds = (first: string[], second: string[]) => {
  if (first.length !== second.length) return false;
  return first.every((id, index) => id === second[index]);
};

const isTurn = (turn: Turn | undefined): turn is Turn => Boolean(turn);

export const turnSignal = (id: string) => turnSignals.get(id);

export const readTurns = () =>
  untracked(() => turnIdsState.value.map((id) => turnSignals.get(id)?.value).filter(isTurn));

export const replaceTurns = (nextTurns: Turn[]) => {
  const nextIds = nextTurns.map((turn) => turn.id);
  const nextIdSet = new Set(nextIds);

  batch(() => {
    for (const id of turnSignals.keys()) {
      if (!nextIdSet.has(id)) turnSignals.delete(id);
    }

    for (const turn of nextTurns) {
      const existing = turnSignals.get(turn.id);
      if (existing) {
        if (existing.value !== turn) existing.value = turn;
      } else {
        turnSignals.set(turn.id, signal(turn));
      }
    }

    if (!sameIds(turnIdsState.value, nextIds)) turnIdsState.value = nextIds;
  });
};

export const updateTurns = (updater: (current: Turn[]) => Turn[]) => {
  const current = readTurns();
  const next = updater(current);
  if (next !== current) replaceTurns(next);
  return next;
};
