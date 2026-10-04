import { historyDetail } from '@main/details';
import type { ChatEvent, HistoryTurn, HistoryTurnDetail } from '@main/types';

const maxLiveAssistantDetails = 32;

const hasSupplement = (turn: HistoryTurn) => Boolean(turn.thinking || turn.details?.length);

const trailingWorkOnlyTurn = (turn: HistoryTurn) => {
  if (turn.text) return false;
  return turn.role === 'event' || (turn.role === 'assistant' && hasSupplement(turn));
};

const nextDetailIndex = (details: HistoryTurnDetail[]) =>
  details.reduce((largest, detail) => {
    const index = Number(detail.id.slice(detail.id.lastIndexOf(':') + 1));
    return Number.isInteger(index) ? Math.max(largest, index) : largest;
  }, -1) + 1;

export const appendLiveAssistantTurn = (turns: HistoryTurn[], liveTurn: HistoryTurn): HistoryTurn[] => {
  const activeKeys = new Set(
    (liveTurn.details ?? []).filter((detail) => detail.state === 'active').map((detail) => detail.key)
  );
  const history = turns.map((turn) => ({
    ...turn,
    ...(turn.details ? { details: turn.details.filter((detail) => !activeKeys.has(detail.key)) } : {})
  }));
  const historyKeys = new Set(history.flatMap((turn) => (turn.details ?? []).map((detail) => detail.key)));
  const details = (liveTurn.details ?? []).filter((detail) => !historyKeys.has(detail.key));
  const next = { ...liveTurn, details };
  const last = history.at(-1);
  if (!last || !trailingWorkOnlyTurn(last)) return [...history, next];

  const thinking = [last.thinking, liveTurn.thinking].filter(Boolean).join('\n');
  return [
    ...history.slice(0, -1),
    {
      ...next,
      details: [...(last.details ?? []), ...details],
      ...(thinking ? { thinking } : {})
    }
  ];
};

export const upsertLiveAssistantDetail = (
  details: HistoryTurnDetail[],
  event: ChatEvent,
  turnId: string,
  updatedAt: number
): HistoryTurnDetail[] => {
  const index = details.findIndex((detail) => detail.key === event.key);
  if (index === -1)
    return [...details, historyDetail(event, nextDetailIndex(details), turnId, updatedAt)].slice(
      -maxLiveAssistantDetails
    );

  return details
    .map((detail, detailIndex) =>
      detailIndex === index
        ? {
            ...detail,
            ...event,
            id: detail.id,
            count: detail.count + 1,
            createdAt: detail.createdAt,
            updatedAt
          }
        : detail
    )
    .slice(-maxLiveAssistantDetails);
};
