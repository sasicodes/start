import type { ChatEvent } from '@preload/index';
import { createId } from '@renderer/utils/id';
import type { Turn, TurnDetail } from '@renderer/utils/types';

type TurnUpdater = (updater: (current: Turn[]) => Turn[]) => void;

const maxTurnDetails = 32;

const mergeDetail = (current: TurnDetail, next: ChatEvent, updatedAt: number): TurnDetail => ({
  ...current,
  ...next,
  id: current.id,
  count: current.count + 1,
  createdAt: current.createdAt,
  updatedAt
});

const createDetail = (detail: ChatEvent, createdAt: number): TurnDetail => ({
  ...detail,
  id: createId(),
  count: 1,
  createdAt,
  updatedAt: createdAt
});

const upsertTurnDetail = (details: TurnDetail[], detail: ChatEvent, updatedAt: number) => {
  const index = details.findIndex((item) => item.key === detail.key);
  if (index === -1) return [...details, createDetail(detail, updatedAt)].slice(-maxTurnDetails);

  return details.map((item, itemIndex) => (itemIndex === index ? mergeDetail(item, detail, updatedAt) : item));
};

export const appendTurnDelta = (setTurns: TurnUpdater, id: string, delta: string) => {
  if (!delta) return;

  setTurns((current) => {
    let changed = false;
    const next = current.map((turn) => {
      if (turn.id !== id) return turn;
      changed = true;
      return { ...turn, text: turn.text + delta };
    });
    return changed ? next : current;
  });
};

export const appendTurnDetails = (setTurns: TurnUpdater, id: string, details: ChatEvent[]) => {
  if (details.length === 0) return;

  setTurns((current) => {
    let changed = false;
    const next = current.map((turn) => {
      if (turn.id !== id) return turn;

      let nextDetails = turn.details ?? [];
      for (const detail of details) {
        nextDetails = upsertTurnDetail(nextDetails, detail, Date.now());
      }

      changed = true;
      return { ...turn, details: nextDetails };
    });

    return changed ? next : current;
  });
};

export const appendTurnThinking = (setTurns: TurnUpdater, id: string, delta: string) => {
  if (!delta) return;

  setTurns((current) => {
    let changed = false;
    const next = current.map((turn) => {
      if (turn.id !== id) return turn;
      changed = true;
      return { ...turn, thinking: turn.thinking ? turn.thinking + delta : delta };
    });
    return changed ? next : current;
  });
};

export const setTurnStreaming = (setTurns: TurnUpdater, id: string, streaming: boolean) => {
  setTurns((current) => {
    let changed = false;
    const next = current.map((turn) => {
      if (turn.id !== id || turn.streaming === streaming) return turn;
      changed = true;
      return { ...turn, streaming };
    });
    return changed ? next : current;
  });
};

export const turnActivityLabel = (event: ChatEvent) => (event.state === 'active' ? event.title : '');

export const setTurnActivity = (setTurns: TurnUpdater, id: string, activity?: string) => {
  setTurns((current) => {
    let changed = false;
    const next = current.map((turn) => {
      if (turn.id !== id) return turn;
      if (activity) {
        if (turn.activity === activity) return turn;
        changed = true;
        return { ...turn, activity };
      }
      if (!turn.activity) return turn;

      const { activity: _activity, ...rest } = turn;
      changed = true;
      return rest;
    });
    return changed ? next : current;
  });
};
