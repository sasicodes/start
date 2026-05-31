import type { HistoryTurn } from '@main/types';

const hasSupplement = (turn: HistoryTurn) => Boolean(turn.thinking || turn.details?.length);

const trailingWorkOnlyTurn = (turn: HistoryTurn) => {
  if (turn.text || !hasSupplement(turn)) return false;
  return turn.role === 'assistant' || turn.role === 'event';
};

export const appendLiveAssistantTurn = (turns: HistoryTurn[], liveTurn: HistoryTurn): HistoryTurn[] => {
  const last = turns.at(-1);
  if (!last || !trailingWorkOnlyTurn(last)) return [...turns, liveTurn];
  return [...turns.slice(0, -1), liveTurn];
};
