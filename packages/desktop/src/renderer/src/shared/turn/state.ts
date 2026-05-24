import type { ChatEvent } from '@preload/index';
import { createId } from '@renderer/utils/id';
import type { Turn, TurnActivityItem, TurnDetail } from '@renderer/utils/types';

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

const updateActivityDetail = (items: TurnActivityItem[], detail: ChatEvent, updatedAt: number): TurnActivityItem[] => {
  const index = items.findLastIndex(
    (item) => item.type === 'detail' && item.detail.key === detail.key && item.detail.state !== 'done'
  );
  if (index === -1) {
    const item: TurnActivityItem = { id: createId(), type: 'detail', detail: createDetail(detail, updatedAt) };
    return [...items, item].slice(-maxTurnDetails);
  }

  return items.map((item, itemIndex) =>
    itemIndex === index && item.type === 'detail'
      ? { ...item, detail: mergeDetail(item.detail, detail, updatedAt) }
      : item
  );
};

const appendActivityThinking = (items: TurnActivityItem[], delta: string, updatedAt: number): TurnActivityItem[] => {
  const last = items.at(-1);
  if (last?.type !== 'thinking') {
    const item: TurnActivityItem = { id: createId(), type: 'thinking', text: delta, createdAt: updatedAt, updatedAt };
    return [...items, item].slice(-maxTurnDetails);
  }

  return items.map((item) =>
    item.id === last.id && item.type === 'thinking' ? { ...item, text: item.text + delta, updatedAt } : item
  );
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
      let activityItems = turn.activityItems ?? [];
      for (const detail of details) {
        const updatedAt = Date.now();
        nextDetails = upsertTurnDetail(nextDetails, detail, updatedAt);
        activityItems = updateActivityDetail(activityItems, detail, updatedAt);
      }

      changed = true;
      return { ...turn, activityItems, details: nextDetails };
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
      return {
        ...turn,
        activityItems: appendActivityThinking(turn.activityItems ?? [], delta, Date.now()),
        thinking: turn.thinking ? turn.thinking + delta : delta
      };
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
