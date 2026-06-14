import type { ChatEvent } from '@preload/index';
import { updateTurn } from '@renderer/state/chat';
import { createId } from '@renderer/utils/id';
import type { TurnActivityItem, TurnDetail } from '@renderer/utils/types';

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

const isSubagentEvent = (detail: ChatEvent | TurnDetail) =>
  detail.title === 'Sub-agents failed' || detail.title.startsWith('Spawning ') || detail.title.startsWith('Finished ');

const isSupersededSubagentFailure = (detail: TurnDetail, next: ChatEvent) =>
  detail.state === 'error' && detail.title === 'Sub-agents failed' && isSubagentEvent(next) && next.state !== 'error';

const upsertTurnDetail = (details: TurnDetail[], detail: ChatEvent, updatedAt: number) => {
  const current = details.filter((item) => !isSupersededSubagentFailure(item, detail));
  const index = current.findIndex((item) => item.key === detail.key);
  if (index === -1) return [...current, createDetail(detail, updatedAt)].slice(-maxTurnDetails);

  return current.map((item, itemIndex) => (itemIndex === index ? mergeDetail(item, detail, updatedAt) : item));
};

const updateActivityDetail = (items: TurnActivityItem[], detail: ChatEvent, updatedAt: number): TurnActivityItem[] => {
  const current = items.filter((item) => item.type !== 'detail' || !isSupersededSubagentFailure(item.detail, detail));
  const index = current.findLastIndex(
    (item) => item.type === 'detail' && item.detail.key === detail.key && item.detail.state !== 'done'
  );
  if (index === -1) {
    const item: TurnActivityItem = { id: createId(), type: 'detail', detail: createDetail(detail, updatedAt) };
    return [...current, item].slice(-maxTurnDetails);
  }

  return current.map((item, itemIndex) =>
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

export const appendTurnDelta = (id: string, delta: string) => {
  if (!delta) return;

  updateTurn(id, (turn) => ({ ...turn, text: turn.text + delta }));
};

export const appendTurnDetails = (id: string, details: ChatEvent[]) => {
  if (details.length === 0) return;

  updateTurn(id, (turn) => {
    let nextDetails = turn.details ?? [];
    let activityItems = turn.activityItems ?? [];
    for (const detail of details) {
      const updatedAt = Date.now();
      nextDetails = upsertTurnDetail(nextDetails, detail, updatedAt);
      activityItems = updateActivityDetail(activityItems, detail, updatedAt);
    }

    return { ...turn, activityItems, details: nextDetails };
  });
};

export const appendTurnThinking = (id: string, delta: string) => {
  if (!delta) return;

  updateTurn(id, (turn) => ({
    ...turn,
    activityItems: appendActivityThinking(turn.activityItems ?? [], delta, Date.now()),
    thinking: turn.thinking ? turn.thinking + delta : delta
  }));
};

export const setTurnStreaming = (id: string, streaming: boolean) => {
  updateTurn(id, (turn) => (turn.streaming === streaming ? turn : { ...turn, streaming }));
};

export const turnActivityLabel = (event: ChatEvent) => (event.state === 'active' ? event.title : '');

export const setTurnActivity = (id: string, activity?: string) => {
  updateTurn(id, (turn) => {
    if (activity) {
      if (turn.activity === activity) return turn;
      return { ...turn, activity };
    }
    if (!turn.activity) return turn;

    const { activity: _activity, ...rest } = turn;
    return rest;
  });
};
