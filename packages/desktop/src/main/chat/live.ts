import { historyDetail } from '@main/details';
import type { ChatEvent, HistoryTurn, HistoryTurnDetail } from '@main/types';

const maxLiveAssistantDetails = 32;

const hasSupplement = (turn: HistoryTurn) => Boolean(turn.thinking || turn.details?.length);

const trailingWorkOnlyTurn = (turn: HistoryTurn) => {
  if (turn.text || !hasSupplement(turn)) return false;
  return turn.role === 'assistant' || turn.role === 'event';
};

const nextDetailIndex = (details: HistoryTurnDetail[]) =>
  details.reduce((largest, detail) => {
    const index = Number(detail.id.slice(detail.id.lastIndexOf(':') + 1));
    return Number.isInteger(index) ? Math.max(largest, index) : largest;
  }, -1) + 1;

export const appendLiveAssistantTurn = (turns: HistoryTurn[], liveTurn: HistoryTurn): HistoryTurn[] => {
  const last = turns.at(-1);
  if (!last || !trailingWorkOnlyTurn(last)) return [...turns, liveTurn];
  return [...turns.slice(0, -1), liveTurn];
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
