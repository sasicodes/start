import type { HistoryTurn, HistoryTurnDetail } from '@main/types';

const mergeText = (current: string, next: string) => [current, next].filter(Boolean).join('\n').trim();

const detailOnlyTurn = (turn: HistoryTurn) => {
  if (turn.text || turn.thinking || !turn.details?.length) return false;
  return turn.role === 'event' || turn.role === 'terminal';
};

const pendingTurn = (details: HistoryTurnDetail[], thinking: string, createdAt: number, index: number): HistoryTurn => {
  const turn: HistoryTurn = {
    text: '',
    createdAt,
    role: 'event',
    id: `work:${createdAt}:${index}`
  };

  if (details.length > 0) turn.details = details;
  if (thinking) turn.thinking = thinking;
  return turn;
};

const mergeWork = (turn: HistoryTurn, details: HistoryTurnDetail[], thinking: string): HistoryTurn => {
  const nextDetails = [...(turn.details ?? []), ...details];
  const nextThinking = mergeText(turn.thinking ?? '', thinking);
  const next: HistoryTurn = {
    id: turn.id,
    role: turn.role,
    text: turn.text,
    createdAt: turn.createdAt
  };

  if (nextDetails.length > 0) next.details = nextDetails;
  if (nextThinking) next.thinking = nextThinking;
  return next;
};

export const combineHistoryTurns = (turns: HistoryTurn[]) => {
  let pendingThinking = '';
  let pendingCreatedAt = 0;
  let lastAssistantIndex = -1;
  const result: HistoryTurn[] = [];
  let pendingDetails: HistoryTurnDetail[] = [];

  const clearPending = () => {
    pendingDetails = [];
    pendingThinking = '';
    pendingCreatedAt = 0;
  };

  const pushPending = () => {
    if (pendingDetails.length === 0 && !pendingThinking) return;
    result.push(pendingTurn(pendingDetails, pendingThinking, pendingCreatedAt, result.length));
    clearPending();
  };

  const appendPending = (turn: HistoryTurn) => {
    pendingDetails = [...pendingDetails, ...(turn.details ?? [])];
    pendingThinking = mergeText(pendingThinking, turn.thinking ?? '');
    if (!pendingCreatedAt) pendingCreatedAt = turn.createdAt;
  };

  const appendToLastAssistant = (turn: HistoryTurn) => {
    const assistant = result[lastAssistantIndex];
    if (!assistant) return false;

    result[lastAssistantIndex] = mergeWork(assistant, turn.details ?? [], turn.thinking ?? '');
    return true;
  };

  for (const turn of turns) {
    if (turn.role === 'user') {
      if (result.length === 0) clearPending();
      else pushPending();
      result.push(turn);
      lastAssistantIndex = -1;
      continue;
    }

    if (detailOnlyTurn(turn)) {
      if (!appendToLastAssistant(turn)) appendPending(turn);
      continue;
    }

    if (turn.role === 'assistant' && !turn.text) {
      if (!appendToLastAssistant(turn)) appendPending(turn);
      continue;
    }

    if (turn.role === 'assistant') {
      const assistant = mergeWork(turn, pendingDetails, pendingThinking);
      result.push(assistant);
      lastAssistantIndex = result.length - 1;
      clearPending();
      continue;
    }

    pushPending();
    result.push(turn);
    lastAssistantIndex = -1;
  }

  pushPending();
  return result;
};
